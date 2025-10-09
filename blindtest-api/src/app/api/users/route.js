import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

// --------------------------------------------
// GET /api/users → Récupère tous les utilisateurs
// --------------------------------------------
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(users, { status: 200 });
  } catch (error) {
    console.error("❌ Erreur GET /api/users :", error);
    return NextResponse.json(
      { error: "Erreur serveur lors de la récupération des utilisateurs" },
      { status: 500 }
    );
  }
}

// --------------------------------------------
// POST /api/users → Crée un nouvel utilisateur
// --------------------------------------------
export async function POST(req) {
  try {
    const body = await req.json();
    const { username, email, password } = body;

    // 🧩 Validation simple
    if (!username || !email || !password) {
      return NextResponse.json(
        { error: "Tous les champs sont requis" },
        { status: 400 }
      );
    }

    // 🔍 Vérifie si l'email existe déjà
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Un utilisateur avec cet email existe déjà" },
        { status: 409 }
      );
    }

    // 🔐 Hash du mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // 🧱 Création de l'utilisateur
    const newUser = await prisma.user.create({
      data: { username, email, password: hashedPassword },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
      },
    });

    console.log("✅ Utilisateur créé :", newUser.username);
    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error("❌ Erreur POST /api/users :", error);
    return NextResponse.json(
      { error: "Erreur serveur lors de la création de l'utilisateur" },
      { status: 500 }
    );
  }
}
