import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Domaines autorisés pour CORS
const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  process.env.FRONTEND_URL,
].filter(Boolean);

// Helper pour obtenir les headers CORS
function getCorsHeaders(origin) {
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
  };
}

// ------- CORS pour les requêtes OPTIONS (preflight) -------
export async function OPTIONS(req) {
  const origin = req.headers.get("origin");
  return NextResponse.json(null, {
    status: 200,
    headers: getCorsHeaders(origin),
  });
}

// ------- PATCH / update round -------
export async function PATCH(req, { params }) {
  const origin = req.headers.get("origin");
  const { gameId, roundId } = await params;
  const { status } = await req.json();

  console.log("PATCH request:", { gameId, roundId, status });

  const corsHeaders = getCorsHeaders(origin);

  try {
    const updated = await prisma.round.update({
      where: { id: roundId },
      data: { status },
    });

    console.log("UPDATED:", updated);
    return NextResponse.json(updated, {
      headers: corsHeaders,
    });

  } catch (err) {
    console.error("❌ PATCH ERROR:", err);
    return NextResponse.json({ error: err.message }, { 
      status: 500,
      headers: corsHeaders,
    });
  }
}

