"use client";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) setStatus("Lien invalide");
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) return;
    if (password.length < 6) {
      setStatus("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }
    if (password !== confirm) {
      setStatus("Les mots de passe ne correspondent pas");
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de la réinitialisation");
      setStatus("Mot de passe mis à jour. Redirection...");
      setTimeout(() => router.push("/auth"), 1500);
    } catch (err) {
      setStatus(err.message || "Erreur serveur ou lien expiré");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-base-200 p-6">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body">
          <h1 className="text-2xl font-bold text-primary mb-2">Réinitialiser le mot de passe</h1>
          <p className="text-sm text-base-content/70 mb-4">Choisis un nouveau mot de passe pour ton compte.</p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="form-control">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nouveau mot de passe"
                className="input input-bordered w-full"
                required
              />
            </div>
            <div className="form-control">
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirmer le mot de passe"
                className="input input-bordered w-full"
                required
              />
            </div>
            <button type="submit" className={`btn btn-primary w-full ${loading ? "loading" : ""}`} disabled={loading}>
              Mettre à jour
            </button>
          </form>

          {status && (
            <div className="alert alert-info mt-4">
              <span>{status}</span>
            </div>
          )}

          <div className="mt-4 text-center">
            <a href="/auth" className="link link-primary">Retour</a>
          </div>
        </div>
      </div>
    </main>
  );
}
