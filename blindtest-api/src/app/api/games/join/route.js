import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { jwtVerify } from "jose";

const prisma = new PrismaClient();

export async function POST(req) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Token manquant" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    const { code } = await req.json();

    if (!code) {
      return NextResponse.json({ error: "Code de partie requis" }, { status: 400 });
    }

    const game = await prisma.game.findUnique({
      where: { code },
      include: {
        players: { include: { user: true } },
      },
    });

    if (!game) {
      return NextResponse.json({ error: "Partie introuvable" }, { status: 404 });
    }

    // Vérifie si le joueur est déjà dans la partie
    const alreadyIn = game.players.some((p) => p.user.id === payload.id);
    if (alreadyIn) {
      return NextResponse.json({ message: "Déjà dans la partie", game }, { status: 200 });
    }

    // Ajoute le joueur à la partie
    const player = await prisma.player.create({
      data: {
        userId: payload.id,
        gameId: game.id,
      },
    });

    const updatedGame = await prisma.game.findUnique({
      where: { id: game.id },
      include: {
        host: { select: { username: true } },
        players: { include: { user: { select: { username: true } } } },
      },
    });

    return NextResponse.json(updatedGame, { status: 200 });
  } catch (error) {
    console.error("Erreur POST /api/games/join :", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
