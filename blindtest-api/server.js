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
  // Configuration CORS dynamique pour production et développement
  const allowedOrigins = [
    "http://localhost:3000",
    process.env.FRONTEND_URL,
  ].filter(Boolean);

  console.log("🌍 CORS configuré pour:", allowedOrigins);

  // Créer un wrapper pour gérer CORS avant Next.js
  const httpServer = createServer((req, res) => {
    const origin = req.headers.origin;
    
    // Vérifier si l'origine est autorisée
    if (allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    }

    // Gérer les requêtes OPTIONS (preflight)
    if (req.method === "OPTIONS") {
      res.writeHead(200);
      res.end();
      return;
    }

    // Passer la requête au handler Next.js
    handler(req, res);
  });

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
    console.log(`🔒 CORS activé pour: ${allowedOrigins.join(", ")}`);
  });
});
