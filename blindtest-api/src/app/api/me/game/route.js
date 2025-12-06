// /app/api/me/game/route.js
import { NextResponse } from "next/server";
import { PrismaClient, GameStatus } from "@prisma/client";
import { jwtVerify } from "jose";

const prisma = new PrismaClient();

export async function GET(req) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Token manquant" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.id;

    const game = await prisma.game.findFirst({
      where: {
        status: { in: [GameStatus.WAITING, GameStatus.PLAYING] },
        OR: [
          { hostId: userId },
          { players: { some: { userId } } },
        ],
      },
      select: { id: true, code: true, status: true },
    });

    return NextResponse.json({ game }, { status: 200 });
  } catch (error) {
    console.error("Erreur GET /api/me/game :", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
