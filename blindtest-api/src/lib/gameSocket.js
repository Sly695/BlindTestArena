import { Server } from "socket.io";
import { PrismaClient } from "@prisma/client";
import { jwtVerify } from "jose";

const prisma = new PrismaClient();
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key"
);

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

    // Rejoindre la room du jeu si fournie
    if (gameId) {
      socket.join(`game:${gameId}`);
    }

    try {
      // Vérifier le token si présent (connexion permissive pour l'instant)
      if (token) {
        await jwtVerify(token, JWT_SECRET);
      }

      // Charger le jeu de la base de données si gameId fourni
      let game = null;
      if (gameId) {
        game = await prisma.game.findUnique({
          where: { id: gameId },
          include: {
            players: true,
            roundsData: { orderBy: { createdAt: "asc" } },
          },
        });

        if (!game) {
          socket.emit("error", { message: "Partie non trouvée" });
        }
      }

      // Initialiser l'état du jeu s'il n'existe pas
      if (gameId && game && !activeGames.has(gameId)) {
        activeGames.set(gameId, {
          status: game.status,
          currentRoundIndex: (game.roundsData?.length ?? 0) - 1,
          roundPhase:
            (game.roundsData?.length ?? 0) > 0
              ? game.roundsData[game.roundsData.length - 1].status
              : "THEME_SELECTION",
          votes: {},
          answers: {},
          voteTimer: null,
          userVotes: {},
        });
      }

      // Envoyer l'état actuel au client
      if (gameId && game) {
        const gameState = activeGames.get(gameId);
        socket.emit("game:synced", {
          game,
          gameState,
        });
      }

      // Broadcaster le nouvel utilisateur à tous les clients
      if (gameId && game) {
        io.to(`game:${gameId}`).emit("game:updated", game);
      }
    } catch (error) {
      console.error("❌ Erreur connexion:", error);
      socket.emit("error", { message: "Authentification échouée" });
    }

    // ============================================
    // ÉVÉNEMENT: Le host démarre la partie
    // ============================================
    socket.on("game:start", async (data) => {
      const { gameId } = data || {};
      console.log("🚀 Démarrage de la partie:", gameId);

      try {
        // Vérifier l'état courant du jeu; ne démarrer que si WAITING
        const current = await prisma.game.findUnique({
          where: { id: gameId },
          include: { players: true },
        });
        if (!current) return;
        if (current.status !== "WAITING") {
          // Déjà démarré ou terminé: renvoyer l'état sans relancer
          io.to(`game:${gameId}`).emit("game:updated", current);
          return;
        }

        const game = await prisma.game.update({
          where: { id: gameId },
          data: { status: "PLAYING" },
          include: { players: true },
        });

        const gameState = activeGames.get(gameId) || {};
        gameState.status = "PLAYING";
        gameState.roundPhase = "THEME_SELECTION";
        gameState.votes = {};
        activeGames.set(gameId, gameState);

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
    // Compat: ouverture de la modale de vote (frontend)
    // Réinitialise les votes et démarre un timer de finalisation
    // ============================================
    socket.on("modal:open", (data) => {
      const { gameId } = data;
      const gameState = activeGames.get(gameId);
      if (!gameState) return;
      beginThemeSelection(gameId, gameState, io);
    });

    // ============================================
    // ÉVÉNEMENT: Un joueur vote pour un thème (frontend envoie 'vote:submitted')
    // ============================================
    socket.on("vote:submitted", async (data) => {
      console.log("🗳️ Vote reçu:", data.playlistId);
      const { gameId, playlistId, userId } = data;

      try {
        const gameState = activeGames.get(gameId);
        if (!gameState) return;

        // Si l'utilisateur a déjà voté, décrémenter son ancien vote
        if (userId && gameState.userVotes?.[userId]) {
          const oldPlaylistId = gameState.userVotes[userId];
          gameState.votes[oldPlaylistId] = Math.max(
            0,
            (gameState.votes[oldPlaylistId] || 0) - 1
          );
        }

        // Enregistrer le nouveau vote et incrémenter
        if (userId) gameState.userVotes[userId] = playlistId;
        gameState.votes[playlistId] = (gameState.votes[playlistId] || 0) + 1;

        // Broadcaster les votes à tous les clients (nom compatible frontend)
        io.to(`game:${gameId}`).emit("votes:updated", {
          votes: gameState.votes,
        });

        // Ne pas finaliser immédiatement même si tous ont voté.
        // La finalisation se fait via le timer démarré par 'modal:open'.
        // La finalisation se fait via le timer démarré par 'modal:open'.
      } catch (error) {
        console.error("❌ Erreur vote:", error);
      }
    });

    // ============================================
    // Compat: ancien événement 'vote_theme' (frontend legacy)
    // Met à jour les votes via Prisma et rebroadcast 'update_votes'
    // ============================================
    socket.on("vote_theme", async ({ gameId, userId, theme }) => {
      try {
        await prisma.themeVote.upsert({
          where: { gameId_userId: { gameId, userId } },
          update: { theme },
          create: { gameId, userId, theme },
        });

        const votes = await prisma.themeVote.groupBy({
          by: ["theme"],
          _count: { theme: true },
          where: { gameId },
        });

        const formattedVotes = votes.reduce((acc, v) => {
          acc[v.theme] = v._count.theme;
          return acc;
        }, {});

        io.to(`game:${gameId}`).emit("update_votes", formattedVotes);
      } catch (err) {
        console.error("Erreur enregistrement vote (legacy):", err);
      }
    });

    // ============================================
    // Compat: ancien événement 'host_start_vote' (frontend legacy)
    // Lance un vote en envoyant 'start_vote' et calcule le résultat après 10s
    // ============================================
    socket.on("host_start_vote", async ({ gameId }) => {
      try {
        const options = [
          "Rap Français",
          "Pop Internationale",
          "Rock",
          "Années 2000",
          "Electro",
        ];

        await prisma.themeVote.deleteMany({ where: { gameId } });

        io.to(`game:${gameId}`).emit("start_vote", { options });

        setTimeout(async () => {
          const votes = await prisma.themeVote.groupBy({
            by: ["theme"],
            _count: { theme: true },
            where: { gameId },
          });

          const winner =
            votes.length > 0
              ? votes.reduce((a, b) =>
                  a._count.theme > b._count.theme ? a : b
                ).theme
              : options[0];

          io.to(`game:${gameId}`).emit("vote_result", { winningTheme: winner });

          // Optionnel: démarrer un round via startRound si souhaité
          // Ici on aligne avec le nouveau flux: émettre 'vote:finalized'
          io.to(`game:${gameId}`).emit("vote:finalized", {
            winnerPlaylistId: winner,
          });
        }, 10000);
      } catch (error) {
        console.error("❌ Erreur host_start_vote (legacy):", error);
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

    // ============================================
    // ÉVÉNEMENT: Rebroadcast client -> server pour round créé via REST
    // Permet à l'hôte de notifier tous les joueurs après POST /rounds
    // ============================================
    socket.on("round:created", (data) => {
      if (!data?.gameId || !data?.round) return;
      io.to(`game:${data.gameId}`).emit("round:created", data);
    });

    // ============================================
    // ÉVÉNEMENT: Rejoindre une room depuis le chat
    // ============================================
    socket.on("join_room", ({ gameId, player }) => {
      if (!gameId) return;
      socket.join(`game:${gameId}`);
      io.to(`game:${gameId}`).emit("player_joined", player);
    });

    // Un joueur annonce qu'il quitte la partie (pour MAJ temps réel UI)
    socket.on("player:left", ({ gameId, userId }) => {
      if (!gameId || !userId) return;
      io.to(`game:${gameId}`).emit("player_left", { userId });
    });

    // L'hôte quitte: terminer la partie et informer tout le monde
    socket.on("host:quit", async ({ gameId, hostId }) => {
      if (!gameId || !hostId) return;
      try {
        const game = await prisma.game.update({
          where: { id: gameId },
          data: { status: "FINISHED" },
          include: { players: true },
        });

        const state = activeGames.get(gameId);
        if (state?.voteTimer) {
          clearTimeout(state.voteTimer);
          state.voteTimer = null;
        }
        activeGames.set(gameId, { ...(state || {}), status: "FINISHED" });

        io.to(`game:${gameId}`).emit("game:updated", game);
        io.to(`game:${gameId}`).emit("game:host_left", {
          message: "L’hôte a terminé la partie.",
        });
      } catch (err) {
        console.error("❌ Erreur host:quit:", err);
      }
    });

    // ============================================
    // ÉVÉNEMENT: Chat et scoring permissif pendant le round
    // ============================================
    socket.on("send_message", async ({ gameId, user, text }) => {
      if (!gameId || !user || !text) return;
      const roomName = `game:${gameId}`;
      io.to(roomName).emit("new_message", { user, text, time: Date.now() });

      // Scoring uniquement pendant la phase PLAYING
      const gameState = activeGames.get(gameId);
      if (!gameState || gameState.roundPhase !== "PLAYING") return;

      // Round courant
      const round = gameState.currentRound;
      if (!round) return;

      const award = gameState.roundAwards[user.id] || {
        title: false,
        artist: false,
      };

      const answer = normalize(text);
      const title = normalize(round.songTitle);
      const artist = normalize(round.artist);

      let points = 0;
      let awardedTitle = award.title;
      let awardedArtist = award.artist;

      // Titre: +20
      if (!awardedTitle && permissiveMatch(answer, title)) {
        points += 20;
        awardedTitle = true;
      }

      // Artiste: +10
      if (!awardedArtist && permissiveMatch(answer, artist)) {
        points += 10;
        awardedArtist = true;
      }

      if (points > 0) {
        gameState.roundAwards[user.id] = {
          title: awardedTitle,
          artist: awardedArtist,
        };

        // Mise à jour du score en base
        try {
          await prisma.player.updateMany({
            where: { gameId, userId: user.id },
            data: { score: { increment: points } },
          });

          // Informer les clients de la mise à jour (optionnel pour UI)
          io.to(roomName).emit("score:updated", {
            userId: user.id,
            points,
            roundId: round.id,
            awarded: { title: awardedTitle, artist: awardedArtist },
          });
        } catch (err) {
          console.error("❌ Erreur mise à jour score:", err);
        }
      }
    });

    socket.on("disconnect", () => {
      console.log("❌ Joueur déconnecté:", socket.id);
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

    const randomTrack =
      playlistData.data[Math.floor(Math.random() * playlistData.data.length)];

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
    gameState.currentRound = round;
    gameState.roundAwards = {};

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
    // Après la révélation, effectuer une pause de 10s pendant laquelle
    // le client affiche un décompte dans la navbar, puis lancer la modale de vote.
    const pauseSeconds = 10;

    // Envoyer l'événement de pause (le client fait le décompte localement)
    io.to(`game:${gameId}`).emit("round:pauseBeforeVote", {
      seconds: pauseSeconds,
    });

    setTimeout(async () => {
      // Vérifier l'état du jeu et décider si on continue
      const game = await prisma.game.findUnique({
        where: { id: gameId },
        include: { roundsData: true, players: true },
      });

      // Si on a atteint le nombre max de rounds -> fin de partie
      // "rounds" est le nombre total de rounds prévus dans la partie (Game.rounds)
      // La relation en base s'appelle "roundsData" (liste des rounds joués)
      if (gameState.currentRoundIndex >= game.rounds) {
        await finishGame(gameId, gameState, io);
      } else {
        gameState.roundPhase = "THEME_SELECTION";
        gameState.votes = {};

        // Ouvrir directement la modale de vote et démarrer le timer côté serveur
        beginThemeSelection(gameId, gameState, io);
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
      include: { players: true, roundsData: true },
    });

    gameState.status = "FINISHED";

    io.to(`game:${gameId}`).emit("game:updated", game);
    io.to(`game:${gameId}`).emit("game:finished", {
      game,
      winner: game.players.reduce((a, b) => (a.score > b.score ? a : b)),
    });
  } catch (error) {
    console.error("❌ Erreur fin de partie:", error);
  }
}

// Démarre la sélection de thème (ouvre modale et timer serveur)
function beginThemeSelection(gameId, gameState, io) {
  // Réinitialiser votes et phase
  gameState.roundPhase = "THEME_SELECTION";
  gameState.votes = {};
  gameState.userVotes = {};

  // Annuler un timer existant
  if (gameState.voteTimer) {
    clearTimeout(gameState.voteTimer);
    gameState.voteTimer = null;
  }

  // Informer les clients que la modale est ouverte
  io.to(`game:${gameId}`).emit("modal:open", {
    gameId,
    type: "THEME_SELECTION",
  });

  // Démarrer un timer de 10s pour finaliser le vote
  gameState.voteTimer = setTimeout(async () => {
    try {
      const votes = gameState.votes || {};

      let winner;
      const totalVotes = Object.values(votes).reduce((a, b) => a + b, 0);
      if (totalVotes === 0) {
        // Fallback si personne ne vote: choisir une playlist par défaut
        const playlists = [
          "9563400362",
          "1363560485",
          "751764391",
          "1306931615",
          "3153080842",
          "10153594502",
        ];
        winner = playlists[Math.floor(Math.random() * playlists.length)];
      } else {
        winner = Object.keys(votes).reduce((a, b) =>
          votes[a] > votes[b] ? a : b
        );
      }

      io.to(`game:${gameId}`).emit("vote:finalized", {
        winnerPlaylistId: winner,
        votes,
      });

      await startRound(gameId, gameState, io);
    } catch (err) {
      console.error("❌ Erreur finalisation vote (theme selection):", err);
    } finally {
      gameState.voteTimer = null;
    }
  }, 10000);
}

// --------------------------------------------
// Helpers: matching permissif
// --------------------------------------------
function normalize(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9\s]/g, " ") // remove punctuation
    .replace(/\s+/g, " ")
    .trim();
}

function permissiveMatch(answer, target) {
  if (!answer || !target) return false;
  // direct include
  if (answer.includes(target) || target.includes(answer)) return true;

  // token overlap: require at least 60% of target tokens present in answer
  const aTokens = new Set(answer.split(" "));
  const tTokens = target.split(" ").filter(Boolean);
  const overlap = tTokens.filter((t) => aTokens.has(t)).length;
  if (tTokens.length > 0 && overlap / tTokens.length >= 0.6) return true;

  // Levenshtein ratio threshold
  const ratio = similarityRatio(answer, target);
  return ratio >= 0.65; // allow minor typos
}

function similarityRatio(a, b) {
  const dist = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length) || 1;
  return 1 - dist / maxLen;
}

function levenshtein(a, b) {
  const m = a.length,
    n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}
