import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { jwtVerify } from "jose";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

export async function POST(req) {
  try {
    const { token, newPassword } = await req.json();
    if (!token || !newPassword) {
      return NextResponse.json({ error: "Token et nouveau mot de passe requis" }, { status: 400 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    if (payload.type !== "reset" || !payload.email) {
      return NextResponse.json({ error: "Token invalide" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: payload.email } });
    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Erreur POST /api/auth/reset:", error);
    return NextResponse.json({ error: "Erreur serveur ou token expiré" }, { status: 400 });
  }
}
