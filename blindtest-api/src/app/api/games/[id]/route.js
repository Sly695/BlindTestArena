// src/app/api/games/[id]/route.js
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req, context) {
  try {
    // ✅ Nouvelle syntaxe : on attend params
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: "ID de partie manquant" }, { status: 400 });
    }

    // 🔍 Recherche la partie
    const game = await prisma.game.findUnique({
      where: { id },
      include: {
        host: {
          select: { username: true, email: true },
        },
        players: {
          include: { user: { select: { username: true, email: true } } },
        },
        roundsData: true,
      },
    });

    if (!game) {
      return NextResponse.json({ error: "Partie introuvable" }, { status: 404 });
    }

    return NextResponse.json(game, { status: 200 });
  } catch (error) {
    console.error("Erreur GET /api/games/[id] :", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
