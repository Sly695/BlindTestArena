import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";

const prisma = new PrismaClient();

export async function POST(req) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "Email requis" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    // Ne pas révéler si l'email existe ou non
    if (!user) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const token = await new SignJWT({ type: "reset", email })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("15m")
      .sign(secret);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const resetLink = `${appUrl}/auth/reset?token=${encodeURIComponent(token)}`;

    // Envoi d'email via API Brevo
    const { BREVO_API_KEY, SMTP_FROM } = process.env;
    if (BREVO_API_KEY) {
      try {
        const brevo = await import("@getbrevo/brevo");
        const apiInstance = new brevo.TransactionalEmailsApi();
        apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, BREVO_API_KEY);

        await apiInstance.sendTransacEmail({
          sender: { email: SMTP_FROM || "noreply@blindtest.com", name: "BlindTest" },
          to: [{ email }],
          subject: "Réinitialisation du mot de passe",
          htmlContent: `
            <p>Bonjour,</p>
            <p>Tu as demandé la réinitialisation de ton mot de passe.</p>
            <p>Utilise ce lien (valide 15 minutes):</p>
            <p><a href="${resetLink}">${resetLink}</a></p>
          `,
        });
        return NextResponse.json({ ok: true }, { status: 200 });
      } catch (e) {
        console.warn("Brevo API indisponible, fallback dev.", e);
      }
    }

    // Fallback dev: renvoyer le lien
    console.log("📧 Reset password link:", resetLink);
    const isDev = process.env.NODE_ENV !== "production";
    return NextResponse.json({ ok: true, resetLink: isDev ? resetLink : undefined }, { status: 200 });
  } catch (error) {
    console.error("Erreur POST /api/auth/forgot:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
