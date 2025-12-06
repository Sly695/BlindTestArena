import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { jwtVerify } from "jose";
import { GameStatus } from "@prisma/client";

const prisma = new PrismaClient();

// ✅ Création d'une partie
export async function POST(req) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Token manquant" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.id;

    const { visibility, rounds, maxPlayers } = await req.json();

    // 🚫 Vérifie si le joueur a déjà une partie non terminée
    const existingGame = await prisma.game.findFirst({
      where: {
        status: { in: [GameStatus.WAITING, GameStatus.PLAYING] },
        OR: [{ hostId: userId }, { players: { some: { userId } } }],
      },
      select: { id: true, code: true },
    });

    if (existingGame) {
      return NextResponse.json(
        {
          error: "Tu as déjà une partie en cours.",
          existingGameId: existingGame.id,
        },
        { status: 400 }
      );
    }

    // 🎮 Création d'une nouvelle partie
    const code = Math.random().toString(36).substring(2, 7).toUpperCase();

    const game = await prisma.game.create({
      data: {
        code,
        visibility: visibility || "PUBLIC",
        rounds: rounds || 5,
        maxPlayers: maxPlayers || 10,
        hostId: userId,
        status: "WAITING",
        players: {
          create: {
            userId,
          },
        },
      },
      include: {
        host: { select: { username: true } },
        players: { select: { user: { select: { username: true } } } },
      },
    });

    return NextResponse.json({ game }, { status: 201 });
  } catch (error) {
    console.error("Erreur POST /api/games :", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// ✅ Récupère toutes les parties publiques en attente
export async function GET() {
  try {
    const games = await prisma.game.findMany({
      where: {
        visibility: "PUBLIC",
        status: "WAITING",
      },
      include: {
        host: { select: { username: true } },
        players: { select: { user: { select: { username: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = games.map((game) => ({
      id: game.id,
      code: game.code,
      host: game.host.username,
      rounds: game.rounds,
      visibility: game.visibility,
      playersCount: game.players.length,
      maxPlayers: game.maxPlayers,
      players: game.players.map((p) => p.user.username),
    }));

    return NextResponse.json(formatted, { status: 200 });
  } catch (error) {
    console.error("Erreur GET /api/games :", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
