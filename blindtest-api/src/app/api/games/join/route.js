import { NextResponse } from "next/server";
import { PrismaClient, GameStatus } from "@prisma/client";
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
    const userId = payload.id;

    const { code } = await req.json();
    if (!code) {
      return NextResponse.json({ error: "Code de partie requis" }, { status: 400 });
    }

    // 🚫 Étape 1 : Vérifie si le joueur est déjà dans une autre partie active
    const existingGame = await prisma.game.findFirst({
      where: {
        status: { in: [GameStatus.WAITING, GameStatus.PLAYING] },
        OR: [
          { hostId: userId },
          { players: { some: { userId } } },
        ],
      },
      select: { id: true, code: true, status: true },
    });

    if (existingGame) {
      return NextResponse.json(
        {
          error: "Tu participes déjà à une autre partie en cours.",
          existingGameId: existingGame.id,
        },
        { status: 400 }
      );
    }

    // ✅ Étape 2 : Recherche la partie à rejoindre
    const game = await prisma.game.findUnique({
      where: { code },
      include: {
        players: { include: { user: true } },
      },
    });

    if (!game) {
      return NextResponse.json({ error: "Partie introuvable" }, { status: 404 });
    }

    // 🚷 Étape 3 : Vérifie le statut de la partie et la capacité
    if (game.status === GameStatus.FINISHED) {
      return NextResponse.json({ error: "Partie terminée" }, { status: 400 });
    }
    // Optionnel: bloquer si la partie n'est pas en attente (privé en cours autorisé?)
    // if (game.status !== GameStatus.WAITING) {
    //   return NextResponse.json({ error: "Partie indisponible" }, { status: 400 });
    // }
    if (game.players.length >= game.maxPlayers) {
      return NextResponse.json({ error: "Partie complète" }, { status: 400 });
    }

    // 👀 Étape 4 : Vérifie si le joueur est déjà dans cette partie
    const alreadyIn = game.players.some((p) => p.user.id === userId);
    if (alreadyIn) {
      return NextResponse.json({ message: "Déjà dans la partie", game }, { status: 200 });
    }

    // 🎮 Étape 5 : Ajoute le joueur à la partie
    await prisma.player.create({
      data: {
        userId,
        gameId: game.id,
      },
    });

    // 🔄 Étape 6 : Retourne la partie mise à jour
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
