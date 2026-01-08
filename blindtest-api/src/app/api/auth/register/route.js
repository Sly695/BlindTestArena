import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { SignJWT } from "jose";

const prisma = new PrismaClient();

// Utilitaire pour signer un token générique
async function signToken(payload, exp = "1d") {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET);
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(exp)
    .sign(secret);
}

// OPTIONS géré dans server.js pour éviter les conflits

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
        isVerified: false,
      },
      select: {
        id: true,
        username: true,
        email: true,
        isVerified: true,
        createdAt: true,
      },
    });

    // Envoi mail de vérification
    const verifyToken = await signToken({ type: "verify", email: user.email }, "15m");
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const verifyLink = `${appUrl}/auth/verify?token=${encodeURIComponent(verifyToken)}`;

    try {
      const { BREVO_API_KEY, SMTP_FROM } = process.env;
      if (BREVO_API_KEY) {
        const brevo = await import("@getbrevo/brevo");
        const apiInstance = new brevo.TransactionalEmailsApi();
        apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, BREVO_API_KEY);

        await apiInstance.sendTransacEmail({
          sender: { email: SMTP_FROM || "noreply@blindtest.com", name: "BlindTest" },
          to: [{ email: user.email }],
          subject: "Vérifie ton adresse email",
          htmlContent: `
            <p>Bienvenue ${user.username},</p>
            <p>Merci de vérifier ton email pour activer ton compte.</p>
            <p>Ce lien expire dans 15 minutes:</p>
            <p><a href="${verifyLink}">${verifyLink}</a></p>
          `,
        });
      } else {
        console.log("📧 Verify link:", verifyLink);
      }
    } catch (e) {
      console.warn("Brevo API indisponible, lien de vérification logué.", e);
      console.log("📧 Verify link:", verifyLink);
    }

    // ✅ Réponse finale: demander vérification (ne pas loguer l'utilisateur tout de suite)
    return NextResponse.json({ user, message: "Vérifie ton email pour activer le compte." }, { status: 201 });
  } catch (error) {
    console.error("Erreur POST /api/auth/register :", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
