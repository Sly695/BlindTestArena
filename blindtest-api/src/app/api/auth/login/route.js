import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { SignJWT } from "jose";

const prisma = new PrismaClient();

// utilitaire pour générer un token avec jose
async function generateToken(payload) {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET);
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1d") // expire dans 1 jour
    .sign(secret);
}

export async function POST(req) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email et mot de passe requis" },
        { status: 400 }
      );
    }

    // 🔎 Vérifie que l'utilisateur existe
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 401 }
      );
    }

    // 🔒 Compare le mot de passe
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json(
        { error: "Mot de passe incorrect" },
        { status: 401 }
      );
    }

    // 🔑 Génère le token JWT
    const token = await generateToken({
      id: user.id,
      email: user.email,
      username: user.username,
    });

    // ✅ Renvoie le token et les infos utiles
    return NextResponse.json(
      {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Erreur POST /api/auth/login :", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
