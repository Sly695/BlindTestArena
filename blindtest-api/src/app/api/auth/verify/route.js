import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { jwtVerify } from "jose";

const prisma = new PrismaClient();

export async function POST(req) {
  try {
    const { token } = await req.json();
    if (!token) {
      return NextResponse.json({ error: "Token requis" }, { status: 400 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    if (payload.type !== "verify" || !payload.email) {
      return NextResponse.json({ error: "Token invalide" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: payload.email } });
    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    await prisma.user.update({ where: { id: user.id }, data: { isVerified: true, verifiedAt: new Date() } });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Erreur POST /api/auth/verify:", error);
    return NextResponse.json({ error: "Erreur serveur ou token expiré" }, { status: 400 });
  }
}
