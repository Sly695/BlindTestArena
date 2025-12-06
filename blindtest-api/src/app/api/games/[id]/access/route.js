import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { jwtVerify } from "jose";

const prisma = new PrismaClient();

export async function GET(req, { params }) {
  try {
    const { id } = params;
    const authHeader = req.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Token manquant" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.id;

    // 🕵️ Vérifie si le joueur est dans la partie
    const game = await prisma.game.findUnique({
      where: { id },
      include: {
        players: { select: { userId: true } },
      },
    });

    if (!game) {
      return NextResponse.json({ error: "Partie introuvable" }, { status: 404 });
    }

    const isPlayer = game.players.some((p) => p.userId === userId);
    const isHost = game.hostId === userId;

    if (!isPlayer && !isHost) {
      return NextResponse.json(
        { error: "Accès refusé à cette partie" },
        { status: 403 }
      );
    }

    return NextResponse.json({ allowed: true, game }, { status: 200 });
  } catch (error) {
    console.error("Erreur GET /api/games/[id]/access :", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
