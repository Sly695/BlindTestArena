"use client";
import { useState } from "react";

export default function ForgetPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/forgot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de la demande");
      if (data.resetLink) {
        setStatus(`Lien (dev): ${data.resetLink}`);
      } else {
        setStatus("Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.");
      }
    } catch (err) {
      setStatus(err.message || "Erreur serveur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-base-200 p-6">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body">
          <h1 className="text-2xl font-bold text-primary mb-2">Mot de passe oublié</h1>
          <p className="text-sm text-base-content/70 mb-4">Entre ton adresse email pour recevoir un lien de réinitialisation.</p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="form-control">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Adresse mail"
                className="input input-bordered w-full"
                required
              />
            </div>
            <button type="submit" className={`btn btn-primary w-full ${loading ? "loading" : ""}`} disabled={loading}>
              Envoyer le lien
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
