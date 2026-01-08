import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import { setupGameSocket } from "./src/lib/gameSocket.js";

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT || "3001", 10);

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const allowedOrigins = [
    "http://localhost:3000",
    "https://localhost:3000",
    process.env.FRONTEND_URL,
  ].filter(Boolean);

  console.log("🌍 CORS configuré pour:", allowedOrigins);
  console.log("📝 FRONTEND_URL =", process.env.FRONTEND_URL);

  // Utiliser directement le handler Next.js sans wrapper pour éviter les problèmes de routing
  const httpServer = createServer(handler);

  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST", "PATCH", "DELETE", "PUT", "OPTIONS"],
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"],
    },
  });

  setupGameSocket(io);

  httpServer.listen(port, hostname, () => {
    console.log(`🚀 Serveur prêt sur http://${hostname}:${port}`);
    console.log(`🔒 CORS activé pour: ${allowedOrigins.join(", ")}`);
  });
});
