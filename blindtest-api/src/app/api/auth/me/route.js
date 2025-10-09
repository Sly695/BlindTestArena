import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { jwtVerify } from "jose";

const prisma = new PrismaClient();

export async function GET(req) {
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);

    // ✅ Vérification du token avec jose
    const { payload } = await jwtVerify(token, secret);

    // 🔎 Recherche de l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, username: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    // ✅ Renvoie les infos du user connecté
    return NextResponse.json(user);
  } catch (error) {
    console.error("Erreur GET /api/auth/me :", error);
    return NextResponse.json({ error: "Token invalide ou expiré" }, { status: 401 });
  }
}
