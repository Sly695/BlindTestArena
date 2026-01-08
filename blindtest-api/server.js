import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import { setupGameSocket } from "./src/lib/gameSocket.js";

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0"; // Important pour Render
const port = parseInt(process.env.PORT || "3001", 10);

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handler);

  // Configuration CORS dynamique pour production et développement
  const allowedOrigins = [
    "http://localhost:3000",
    process.env.FRONTEND_URL,
  ].filter(Boolean);

  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST", "PATCH", "DELETE"],
      credentials: true,
    },
  });

  // Setup le système WebSocket du jeu (événements gérés dans gameSocket.js)
  setupGameSocket(io);

  httpServer.listen(port, hostname, () => {
    console.log(`🚀 Serveur Socket prêt sur http://${hostname}:${port}`);
  });
});
