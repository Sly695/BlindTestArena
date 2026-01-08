import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

// 🔒 Routes qui nécessitent un token
const PROTECTED_ROUTES = [
  "/api/users",
  "/api/rooms",
  "/api/games/join",  // 👈 uniquement les actions nécessitant token
  "/api/games/create",
];

// 🌍 Domaines autorisés (front)
const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "https://localhost:3000",
  process.env.FRONTEND_URL,
].filter(Boolean);

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  const origin = req.headers.get("origin");

  // 🧩 Prépare les headers CORS
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  const corsHeaders = {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };

  // ✅ Répond directement aux requêtes OPTIONS (preflight)
  if (req.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: corsHeaders });
  }

  // ✅ Routes publiques
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/public")
  ) {
    const res = NextResponse.next();
    Object.entries(corsHeaders).forEach(([key, value]) => res.headers.set(key, value));
    return res;
  }

  // 🔐 Vérifie si la route est protégée
  const isProtected = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  // Si la route n'est pas dans la liste, on laisse passer
  if (!isProtected) {
    const res = NextResponse.next();
    Object.entries(corsHeaders).forEach(([key, value]) => res.headers.set(key, value));
    return res;
  }

  // 🧩 Vérifie la présence d’un token
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new NextResponse(
      JSON.stringify({ error: "Token manquant ou invalide" }),
      { status: 401, headers: corsHeaders }
    );
  }

  const token = authHeader.split(" ")[1];

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    // ✅ Injecte les infos utilisateur dans les headers
    const headers = new Headers(req.headers);
    headers.set("x-user-id", payload.id);
    headers.set("x-user-role", payload.role || "player");

    const res = NextResponse.next({ request: { headers } });
    Object.entries(corsHeaders).forEach(([key, value]) => res.headers.set(key, value));
    return res;
  } catch (err) {
    console.error("JWT invalide :", err.message);
    return new NextResponse(
      JSON.stringify({ error: "Token invalide ou expiré" }),
      { status: 401, headers: corsHeaders }
    );
  }
}

// ⚙️ Appliquer ce middleware sur toutes les routes API
export const config = {
  matcher: ["/api/:path*"],
};
