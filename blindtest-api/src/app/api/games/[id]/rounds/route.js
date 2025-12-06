import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * GET /api/games/[id]/rounds
 */
export async function GET(req, context) {
  const { id } = await context.params;

  try {
    const rounds = await prisma.round.findMany({
      where: { gameId: id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(rounds, { status: 200 });
  } catch (error) {
    console.error("GET /rounds error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/**
 * POST /api/games/[id]/rounds
 */
export async function POST(req, context) {
  const { id } = await context.params;
  const body = await req.json();

  const { songTitle, artist, previewUrl, coverUrl, spotifyUrl } = body;

  if (!songTitle || !artist || !previewUrl) {
    return NextResponse.json(
      { error: "Champs songTitle, artist, previewUrl obligatoires" },
      { status: 400 }
    );
  }

  try {
    // 🔥 On récupère le dernier round pour calculer roundIndex
    const lastRound = await prisma.round.findFirst({
      where: { gameId: id },
      orderBy: { roundIndex: "desc" },
    });

    const nextIndex = lastRound ? lastRound.roundIndex + 1 : 1;

    // 🔥 Création du round
    const newRound = await prisma.round.create({
      data: {
        gameId: id,
        songTitle,
        artist,
        previewUrl,
        coverUrl,
        spotifyUrl,
        status: "STARTED",
        answerTime: 30,
        roundIndex: nextIndex,
      },
    });

    return NextResponse.json({ round: newRound }, { status: 201 });
  } catch (error) {
    console.error("POST /rounds error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
