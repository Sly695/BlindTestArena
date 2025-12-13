import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import { PrismaClient } from "@prisma/client";
import { setupGameSocket } from "./src/lib/gameSocket.js";

const prisma = new PrismaClient();

const dev = true;
const app = next({ dev });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handler);

  const io = new Server(httpServer, {
    cors: {
      origin: "http://localhost:3000",
      methods: ["GET", "POST", "PATCH"],
    },
  });

  // Setup le système WebSocket du jeu
  setupGameSocket(io);

  // 🧠 Stockage temporaire des rooms
  const activeRooms = new Map();
  const voteTimers = new Map(); // Stocke les timers de vote

  io.on("connection", (socket) => {
    console.log("🟢 Client connecté :", socket.id);

    // 📡 Extraire gameId et rejoindre la room du jeu
    const gameId = socket.handshake.query.gameId;
    if (gameId) {
      socket.join(`game:${gameId}`);
      console.log(`✅ Client ${socket.id} rejoint game:${gameId}`);
      
      // Initialiser la room s'il n'existe pas
      const roomKey = `game:${gameId}`;
      if (!activeRooms.has(roomKey)) {
        activeRooms.set(roomKey, { 
          votes: {},          // { playlistId: count, ... }
          userVotes: {}       // { userId: playlistId, ... }
        });
        console.log(`📦 Room ${roomKey} créée`);
      }
    }

    // 📡 Rebroadcaster modal:open à tous les joueurs
    socket.on("modal:open", (data) => {
      console.log("📱 modal:open reçu, rebroadcasting...");
      
      const roomKey = `game:${data.gameId}`;
      
      // Réinitialiser les votes pour cette partie
      activeRooms.set(roomKey, { 
        votes: {},           // { playlistId: count, ... }
        userVotes: {}        // { userId: playlistId, ... }
      });
      console.log(`🗳️ Votes réinitialisés pour ${roomKey}`);
      
      // Annuler le timer précédent s'il existe
      if (voteTimers.has(roomKey)) {
        clearTimeout(voteTimers.get(roomKey));
      }
      
      // 📊 Démarrer un timer de 10 secondes pour déterminer le gagnant
      const timer = setTimeout(() => {
        const room = activeRooms.get(roomKey);
        if (!room) return;

        // Déterminer le thème gagnant
        const votes = room.votes;
        let winnerPlaylistId;

        // Si personne n'a voté → aléatoire
        if (Object.keys(votes).length === 0 || Object.values(votes).every(v => v === 0)) {
          const playlists = [
            "9563400362", "1363560485", "751764391",
            "1306931615", "3153080842", "10153594502"
          ];
          winnerPlaylistId = playlists[Math.floor(Math.random() * playlists.length)];
          console.log("❌ Aucun vote, thème aléatoire:", winnerPlaylistId);
        } else {
          // Trouver le max de votes
          const maxVotes = Math.max(...Object.values(votes));
          const winners = Object.keys(votes).filter(id => votes[id] === maxVotes);

          // Si égalité → aléatoire parmi les gagnants
          if (winners.length > 1) {
            winnerPlaylistId = winners[Math.floor(Math.random() * winners.length)];
            console.log("⚔️ Égalité, gagnant aléatoire:", winnerPlaylistId);
          } else {
            winnerPlaylistId = winners[0];
            console.log("🏆 Gagnant:", winnerPlaylistId);
          }
        }

        console.log("� Envoi du thème gagnant à la room:", winnerPlaylistId);
        
        // 📢 Envoyer le gagnant à TOUS les joueurs
        io.to(roomKey).emit("vote:finalized", {
          gameId: data.gameId,
          winnerPlaylistId,
        });

        voteTimers.delete(roomKey);
      }, 10000); // 10 secondes

      voteTimers.set(roomKey, timer);
      
      io.to(`game:${data.gameId}`).emit("modal:open", data);
    });

    // 📡 Rebroadcaster round:created à tous les joueurs
    socket.on("round:created", (data) => {
      console.log("📡 round:created reçu, rebroadcasting...");
      io.to(`game:${data.gameId}`).emit("round:created", data);
    });

    // 📊 Rebroadcaster les votes en temps réel
    socket.on("vote:submitted", (data) => {
      console.log("🗳️ Vote reçu:", data);
      
      const roomKey = `game:${data.gameId}`;
      if (activeRooms.has(roomKey)) {
        const room = activeRooms.get(roomKey);
        
        // Si l'utilisateur a déjà voté, décrémenter son ancien vote
        if (room.userVotes[data.userId]) {
          const oldPlaylistId = room.userVotes[data.userId];
          room.votes[oldPlaylistId] = Math.max(0, (room.votes[oldPlaylistId] || 0) - 1);
          console.log(`🗳️ Ancien vote supprimé pour ${data.userId} sur ${oldPlaylistId}`);
        }
        
        // Incrémenter le nouveau vote
        room.votes[data.playlistId] = (room.votes[data.playlistId] || 0) + 1;
        
        // Mémoriser le vote de cet utilisateur
        room.userVotes[data.userId] = data.playlistId;
        
        console.log("📊 Votes mis à jour:", room.votes);
        console.log("👤 Votes utilisateurs:", room.userVotes);
        
        // Envoyer les votes mis à jour à TOUS les joueurs de la room
        io.to(roomKey).emit("votes:updated", {
          gameId: data.gameId,
          votes: room.votes,
        });
      }
    });

    // �🔹 Rejoindre le lobby
    socket.on("join_lobby", (player) => {
      socket.join("lobby");
      io.to("lobby").emit("player_connected", player);
      console.log(`👤 ${player?.username} a rejoint le lobby`);
    });

    // 🔹 Création d’une nouvelle partie
    socket.on("create_game", (game) => {
      const roomName = `game:${game.id}`;
      socket.join(roomName);
      io.to("lobby").emit("new_game_created", game);
      socket.emit("room_created", { roomName, game });
      activeRooms.set(roomName, { host: game.hostId, votes: {} });
      console.log(`🏠 Room ${roomName} créée par ${game.host?.username}`);
    });

    // 🔹 Rejoindre une partie
    socket.on("join_room", ({ gameId, player }) => {
      const roomName = `game:${gameId}`;
      socket.join(roomName);
      io.to(roomName).emit("player_joined", player);
      console.log(`👥 ${player.username} a rejoint ${roomName}`);
    });

    // 💬 Chat dans une room
    socket.on("send_message", ({ gameId, user, text }) => {
      const roomName = `game:${gameId}`;
      io.to(roomName).emit("new_message", { user, text, time: Date.now() });
      console.log(`💬 [${roomName}] ${user.username}: ${text}`);
    });

    // 🧑‍💼 L’hôte lance un vote
    socket.on("host_start_vote", async ({ gameId }) => {
      console.log(`🎬 L’hôte lance un vote pour la partie ${gameId}`);

      const options = [
        "Rap Français",
        "Pop Internationale",
        "Rock",
        "Années 2000",
        "Electro",
      ];

      // Supprime les anciens votes
      await prisma.themeVote.deleteMany({ where: { gameId } });

      // Envoie les options à tous les joueurs
      const roomName = `game:${gameId}`;
      io.to(roomName).emit("start_vote", { options });

      // Démarre le décompte
      setTimeout(async () => {
        const votes = await prisma.themeVote.groupBy({
          by: ["theme"],
          _count: { theme: true },
          where: { gameId },
        });

        // Détermine le thème gagnant
        const winner =
          votes.length > 0
            ? votes.reduce((a, b) =>
                a._count.theme > b._count.theme ? a : b
              ).theme
            : options[0]; // fallback si personne n’a voté

        console.log(`🏆 Thème gagnant pour ${gameId} : ${winner}`);

        // Création d’un nouveau round dans l’API Next
        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/games/${gameId}/rounds`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ theme: winner }),
            }
          );

          const data = await res.json();
          const newRound = data.round;

          io.to(roomName).emit("vote_result", { winningTheme: winner });
          io.to(roomName).emit("new_round", newRound);
        } catch (err) {
          console.error("❌ Erreur création round :", err);
        }
      }, 10000); // vote 10 sec
    });

    // 🗳️ Quand un joueur vote
    socket.on("vote_theme", async ({ gameId, userId, theme }) => {
      try {
        await prisma.themeVote.upsert({
          where: { gameId_userId: { gameId, userId } },
          update: { theme },
          create: { gameId, userId, theme },
        });

        // Met à jour les votes en temps réel
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
        console.error("Erreur enregistrement vote :", err);
      }
    });

    // 🔻 Déconnexion
    socket.on("disconnect", () => {
      console.log("❌ Client déconnecté :", socket.id);
    });
  });

  httpServer.listen(3001, () => {
    console.log("🚀 Serveur Socket prêt sur http://localhost:3001");
  });
});
