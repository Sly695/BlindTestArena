import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ------- CORS pour les requêtes OPTIONS (preflight) -------
export async function OPTIONS() {
  return NextResponse.json(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "http://localhost:3000",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Max-Age": "86400",
    },
  });
}

// ------- PATCH / update round -------
export async function PATCH(req, { params }) {
  const { gameId, roundId } = await params;
  const { status } = await req.json();

  console.log("PATCH request:", { gameId, roundId, status });

  const corsHeaders = { "Access-Control-Allow-Origin": "http://localhost:3000" };

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

