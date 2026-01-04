"use client";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus("Lien invalide");
      return;
    }
    const verify = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Vérification échouée");
        setStatus("Email vérifié. Tu peux te connecter.");
      } catch (err) {
        setStatus(err.message || "Erreur serveur ou lien expiré");
      } finally {
        setLoading(false);
      }
    };
    verify();
  }, [token]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-base-200 p-6">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body text-center">
          <h1 className="text-2xl font-bold text-primary mb-2">Validation de l'email</h1>
          {loading ? (
            <span className="loading loading-spinner text-primary"></span>
          ) : (
            <p className="text-sm text-base-content/80">{status}</p>
          )}
          <div className="mt-4">
            <a href="/auth" className="btn btn-primary">Aller à la connexion</a>
          </div>
        </div>
      </div>
    </main>
  );
}
