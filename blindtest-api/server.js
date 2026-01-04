import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import { setupGameSocket } from "./src/lib/gameSocket.js";

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

  // Setup le système WebSocket du jeu (événements gérés dans gameSocket.js)
  setupGameSocket(io);

  httpServer.listen(3001, () => {
    console.log("🚀 Serveur Socket prêt sur http://localhost:3001");
  });
});
