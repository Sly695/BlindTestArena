import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const dev = true;
const app = next({ dev });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handler);

  const io = new Server(httpServer, {
    cors: {
      origin: "http://localhost:3000",
      methods: ["GET", "POST, PATCH"],
    },
  });

  // 🧠 Stockage temporaire des rooms
  const activeRooms = new Map();

  io.on("connection", (socket) => {
    console.log("🟢 Client connecté :", socket.id);

    // 🔹 Rejoindre le lobby
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
