import { Server } from "socket.io";
import { PrismaClient } from "@prisma/client";
import { jwtVerify } from "jose";

const prisma = new PrismaClient();
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key");

// Store des jeux en cours (pour l'état en mémoire)
const activeGames = new Map();

/**
 * Structure d'un jeu en mémoire:
 * {
 *   gameId: {
 *     status: "WAITING" | "STARTED" | "FINISHED",
 *     currentRoundIndex: 0,
 *     roundPhase: "THEME_SELECTION" | "PLAYING" | "REVEALED",
 *     roundStartedAt: Date,
 *     votes: { playlistId: count },
 *     ...
 *   }
 * }
 */

export async function setupGameSocket(io) {
  io.on("connection", async (socket) => {
    const gameId = socket.handshake.query.gameId;
    const token = socket.handshake.query.token;

    console.log(`✅ Joueur connecté:`, socket.id, `Partie:`, gameId);

    // Rejoindre la room du jeu
    socket.join(`game:${gameId}`);

    try {
      // Vérifier le token
      await jwtVerify(token, JWT_SECRET);

      // Charger le jeu de la base de données
      const game = await prisma.game.findUnique({
        where: { id: gameId },
        include: { players: true, roundsData: { orderBy: { createdAt: "asc" } } },
      });

      if (!game) {
        socket.emit("error", { message: "Partie non trouvée" });
        return;
      }

      // Initialiser l'état du jeu s'il n'existe pas
      if (!activeGames.has(gameId)) {
        const lastRoundIndex = game.roundsData && game.roundsData.length > 0
          ? game.roundsData[game.roundsData.length - 1].roundIndex
          : 0;
        const lastRoundStatus = game.roundsData && game.roundsData.length > 0
          ? game.roundsData[game.roundsData.length - 1].status
          : "THEME_SELECTION";

        activeGames.set(gameId, {
          status: game.status,
          currentRoundIndex: lastRoundIndex,
          roundPhase: lastRoundStatus,
          votes: {},
          answers: {},
        });
      }

      // Envoyer l'état actuel au client
      const gameState = activeGames.get(gameId);
      socket.emit("game:synced", {
        game,
        gameState,
      });

      // Broadcaster le nouvel utilisateur à tous les clients
      io.to(`game:${gameId}`).emit("game:updated", game);
    } catch (error) {
      console.error("❌ Erreur connexion:", error);
      socket.emit("error", { message: "Authentification échouée" });
    }

    // ============================================
    // ÉVÉNEMENT: Le host démarre la partie
    // ============================================
    socket.on("game:start", async (data) => {
      console.log("🚀 Démarrage de la partie:", gameId);

      try {
        const game = await prisma.game.update({
          where: { id: gameId },
          // Prisma enum GameStatus = WAITING | PLAYING | FINISHED
          data: { status: "PLAYING" },
          include: { players: true },
        });

        const gameState = activeGames.get(gameId);
        // Keep in-memory status aligned with DB enum
        gameState.status = "PLAYING";
        gameState.roundPhase = "THEME_SELECTION";
        gameState.votes = {};

        // Broadcaster à tous les joueurs
        io.to(`game:${gameId}`).emit("game:updated", game);
        io.to(`game:${gameId}`).emit("round:phaseChanged", {
          phase: "THEME_SELECTION",
          message: "Votez pour un thème!",
        });
      } catch (error) {
        console.error("❌ Erreur démarrage:", error);
      }
    });

    // ============================================
    // ÉVÉNEMENT: Un joueur vote pour un thème (frontend envoie 'vote:submitted')
    // ============================================
    socket.on("vote:submitted", async (data) => {
      console.log("🗳️ Vote reçu:", data.playlistId);
      const { gameId, playlistId } = data;

      try {
        const gameState = activeGames.get(gameId);

        if (!gameState) return;

        // Ajouter le vote
        gameState.votes[playlistId] = (gameState.votes[playlistId] || 0) + 1;

        // Broadcaster les votes à tous les clients (nom compatible frontend)
        io.to(`game:${gameId}`).emit("votes:updated", { votes: gameState.votes });

        // Vérifier si tous les joueurs ont voté
        const game = await prisma.game.findUnique({
          where: { id: gameId },
          include: { players: true },
        });

        const totalVotes = Object.values(gameState.votes).reduce((a, b) => a + b, 0);
        if (totalVotes >= (game?.players?.length || 0)) {
          // Tous ont voté -> déterminer le gagnant et démarrer le round
          const winner = Object.keys(gameState.votes).reduce((a, b) =>
            gameState.votes[a] > gameState.votes[b] ? a : b
          );

          // Informer clients du résultat
          io.to(`game:${gameId}`).emit("vote:finalized", {
            winnerPlaylistId: winner,
            votes: gameState.votes,
          });

          // Lancer le round
          await startRound(gameId, gameState, io);
        } else {
          // Attendre 10 secondes ou que tous votent
          setTimeout(async () => {
            // Vérifier si on doit démarrer
            const finalVotes = gameState.votes;
            const totalFinal = Object.values(finalVotes).reduce((a, b) => a + b, 0);
            if (totalFinal > 0) {
              const winner = Object.keys(finalVotes).reduce((a, b) =>
                finalVotes[a] > finalVotes[b] ? a : b
              );

              io.to(`game:${gameId}`).emit("vote:finalized", {
                winnerPlaylistId: winner,
                votes: finalVotes,
              });

              await startRound(gameId, gameState, io);
            }
          }, 10000);
        }
      } catch (error) {
        console.error("❌ Erreur vote:", error);
      }
    });

    // ============================================
    // ÉVÉNEMENT: Un joueur soumet une réponse
    // ============================================
    socket.on("round:answerSubmitted", async (data) => {
      console.log("✍️ Réponse:", data.answer);
      const { gameId, roundId, answer, playerId } = data;

      try {
        const gameState = activeGames.get(gameId);

        // Stocker la réponse
        if (!gameState.answers) gameState.answers = {};
        gameState.answers[playerId] = answer;

        // Broadcaster les réponses à tous les clients
        const game = await prisma.game.findUnique({
          where: { id: gameId },
          include: { players: true },
        });

        const answersCount = Object.keys(gameState.answers).length;
        io.to(`game:${gameId}`).emit("round:answersUpdated", {
          count: answersCount,
          total: game.players.length,
        });
      } catch (error) {
        console.error("❌ Erreur réponse:", error);
      }
    });

    socket.on("disconnect", () => {
      console.log("❌ Joueur déconnecté:", socket.id);
    });

    // ============================================
    // ÉVÉNEMENT: Round créé côté client (fallback)
    // Si le frontend crée le round via l'API, le serveur doit tout de même
    // planifier la révélation et mettre à jour l'état en mémoire.
    socket.on("round:created", async (data) => {
      try {
        console.log("📡 round:created reçu (socket):", data?.round?.id);
        const { gameId } = data || {};
        const gameState = activeGames.get(gameId);
        if (!gameState) return;

        // Si on est déjà en PLAYING, on évite de re-planifier
        if (gameState.roundPhase === "PLAYING") {
          console.log("ℹ️ Round déjà en cours, ignorer round:created");
          return;
        }

        // Mettre à jour l'état
        gameState.roundPhase = "PLAYING";
        gameState.roundStartedAt = new Date();
        gameState.currentRoundIndex = data.round?.roundIndex || gameState.currentRoundIndex;
        gameState.answers = {};
        gameState.votes = {};

        // Rebroadcast pour les autres clients
        io.to(`game:${gameId}`).emit("round:created", data);
        io.to(`game:${gameId}`).emit("round:phaseChanged", { phase: "PLAYING", round: data.round });

        // Planifier la révélation selon answerTime
        const duration = (data.round?.answerTime ?? 30) * 1000;
        setTimeout(async () => {
          try {
            await revealRound(gameId, data.round.id, gameState, io);
          } catch (err) {
            console.error("❌ Erreur lors du reveal programmé:", err);
          }
        }, duration);
      } catch (error) {
        console.error("❌ Erreur round:created handler:", error);
      }
    });
  });
}

/**
 * Démarre un round
 */
async function startRound(gameId, gameState, io) {
  try {
    console.log("🎵 Démarrage du round");

    // Trouver le thème le plus voté
    const selectedPlaylist = Object.keys(gameState.votes).reduce((a, b) =>
      gameState.votes[a] > gameState.votes[b] ? a : b
    );

    // Récupérer une chanson de la playlist
    const playlistRes = await fetch(
      `https://api.deezer.com/playlist/${selectedPlaylist}/tracks?limit=100`
    );
    const playlistData = await playlistRes.json();

    if (!playlistData.data || playlistData.data.length === 0) {
      console.error("❌ Playlist vide");
      return;
    }

    const randomTrack = playlistData.data[Math.floor(Math.random() * playlistData.data.length)];

    // Créer le round en base de données
    const lastRound = await prisma.round.findFirst({
      where: { gameId },
      orderBy: { roundIndex: "desc" },
    });

    const nextIndex = lastRound ? lastRound.roundIndex + 1 : 1;

    const round = await prisma.round.create({
      data: {
        gameId,
        roundIndex: nextIndex,
        songTitle: randomTrack.title,
        artist: randomTrack.artist.name,
        previewUrl: randomTrack.preview,
        coverUrl: randomTrack.album.cover,
        spotifyUrl: randomTrack.link || null,
        answerTime: 30,
        // RoundStatus enum = WAITING | STARTED | FINISHED | REVEALED
        status: "STARTED",
        startsAt: new Date(),
      },
    });

    // Mettre à jour l'état du jeu
    gameState.roundPhase = "PLAYING";
    gameState.roundStartedAt = new Date();
    gameState.currentRoundIndex = nextIndex;
    gameState.answers = {};
    gameState.votes = {};

    // Broadcaster le nouveau round à tous les joueurs
    // Émettre 'round:created' pour être compatible avec le frontend
    io.to(`game:${gameId}`).emit("round:created", { round });
    io.to(`game:${gameId}`).emit("round:updated", round);
    io.to(`game:${gameId}`).emit("round:phaseChanged", {
      phase: "PLAYING",
      round,
    });

    // Après 30 secondes, révéler la réponse
    setTimeout(async () => {
      await revealRound(gameId, round.id, gameState, io);
    }, 30000);
  } catch (error) {
    console.error("❌ Erreur démarrage round:", error);
  }
}

/**
 * Révèle la réponse d'un round
 */
async function revealRound(gameId, roundId, gameState, io) {
  try {
    console.log("✅ Révélation de la réponse");

    const round = await prisma.round.update({
      where: { id: roundId },
      data: { status: "REVEALED", endsAt: new Date() },
    });

    gameState.roundPhase = "REVEALED";

    // Broadcaster la révélation
    io.to(`game:${gameId}`).emit("round:phaseChanged", {
      phase: "REVEALED",
      round,
    });
    // Après la révélation, effectuer une pause de 5s pendant laquelle
    // le client affiche un décompte dans la navbar, puis lancer la modale de vote.
    const pauseSeconds = 5;

    // Envoyer l'événement de pause (le client fait le décompte localement)
    io.to(`game:${gameId}`).emit("round:pauseBeforeVote", { seconds: pauseSeconds });

    setTimeout(async () => {
      // Vérifier l'état du jeu et décider si on continue
      const game = await prisma.game.findUnique({
        where: { id: gameId },
        include: { players: true },
      });

      // Compter les rounds déjà créés pour cette partie
      const roundsCount = await prisma.round.count({ where: { gameId } });

      // Si on a atteint le nombre max de rounds -> fin de partie
      if (roundsCount >= (game.maxRounds || 0)) {
        await finishGame(gameId, gameState, io);
      } else {
        // Ouvrir automatiquement la modale de vote chez tous les clients
        gameState.roundPhase = "THEME_SELECTION";
        gameState.votes = {};

        io.to(`game:${gameId}`).emit("round:startThemeVote", {
          message: "Votez pour le prochain thème!",
          timeout: 10,
        });
      }
    }, pauseSeconds * 1000);
  } catch (error) {
    console.error("❌ Erreur révélation:", error);
  }
}

/**
 * Termine la partie
 */
async function finishGame(gameId, gameState, io) {
  try {
    console.log("🏆 Fin de la partie");

    const game = await prisma.game.update({
      where: { id: gameId },
      data: { status: "FINISHED" },
      include: { players: true, rounds: true },
    });

    gameState.status = "FINISHED";

    io.to(`game:${gameId}`).emit("game:updated", game);
    io.to(`game:${gameId}`).emit("game:finished", {
      game,
      winner: game.players.reduce((a, b) => (a.points > b.points ? a : b)),
    });
  } catch (error) {
    console.error("❌ Erreur fin de partie:", error);
  }
}
