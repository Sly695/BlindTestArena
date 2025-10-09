import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { SignJWT } from "jose";

const prisma = new PrismaClient();

// Fonction utilitaire pour signer un token
async function generateToken(payload) {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET);
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1d") // 1 jour
    .sign(secret);
}

export async function POST(req) {
  try {
    const { username, email, password } = await req.json();

    // 🔎 Vérif des champs
    if (!username || !email || !password) {
      return NextResponse.json(
        { error: "Tous les champs sont requis" },
        { status: 400 }
      );
    }

    // 🔎 Vérifie si un user existe déjà avec cet email
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: "Un utilisateur avec cet email existe déjà" },
        { status: 409 }
      );
    }

    // 🔒 Hash du mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // 💾 Création de l’utilisateur
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
      },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
      },
    });

    // 🔑 Génération du token JWT avec jose
    const token = await generateToken({
      id: user.id,
      email: user.email,
      username: user.username,
    });

    // ✅ Réponse finale
    return NextResponse.json({ user, token }, { status: 201 });
  } catch (error) {
    console.error("Erreur POST /api/auth/register :", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
