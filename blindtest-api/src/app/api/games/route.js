import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { jwtVerify } from "jose";

const prisma = new PrismaClient();

// src/app/api/games/route.js
export async function POST(req) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer "))
      return NextResponse.json({ error: "Token manquant" }, { status: 401 });

    const token = authHeader.split(" ")[1];
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    const { visibility, rounds, maxPlayers } = await req.json();

    // 🎮 Création de la partie
    const code = Math.random().toString(36).substring(2, 7).toUpperCase();
    const game = await prisma.game.create({
      data: {
        code,
        visibility,
        rounds: rounds || 5,
        maxPlayers: maxPlayers,
        hostId: payload.id,
        players: {
          create: {
            userId: payload.id, // le créateur rejoint automatiquement
          },
        },
      },
    });

    return NextResponse.json(game, { status: 201 });
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
