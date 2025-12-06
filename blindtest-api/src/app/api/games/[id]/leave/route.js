import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { jwtVerify } from "jose";

const prisma = new PrismaClient();

export async function POST(req, context) {
  try {
    const { id } = await context.params;
    const authHeader = req.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Token manquant" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.id;

    const game = await prisma.game.findUnique({
      where: { id },
      include: { players: true },
    });

    if (!game) {
      return NextResponse.json({ error: "Partie introuvable" }, { status: 404 });
    }

    const isHost = game.hostId === userId;

    if (isHost) {
      // 👑 Si l’hôte quitte → fin immédiate de la partie
      await prisma.game.update({
        where: { id },
        data: { status: "FINISHED" },
      });

      // Optionnel : supprimer tous les joueurs
      await prisma.player.deleteMany({
        where: { gameId: id },
      });

      return NextResponse.json({ message: "Hôte parti, partie terminée." }, { status: 200 });
    }

    // 👤 Si c’est un joueur “non-hôte”
    await prisma.player.deleteMany({
      where: { gameId: id, userId },
    });

    // 🔎 Vérifie s’il reste encore des joueurs
    const remainingPlayers = await prisma.player.count({
      where: { gameId: id },
    });

    if (remainingPlayers === 0) {
      // 🚮 Supprime la partie s’il n’y a plus de joueurs
      await prisma.game.delete({
        where: { id },
      });

      return NextResponse.json(
        { message: "Dernier joueur parti, partie supprimée." },
        { status: 200 }
      );
    }

    return NextResponse.json({ message: "Joueur quitté la partie." }, { status: 200 });
  } catch (error) {
    console.error("Erreur POST /api/games/[id]/leave :", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
