"use client";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login, register } = useAuth();
  const router = useRouter();

  // Gère la saisie des inputs
  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Gère la soumission du formulaire
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignUp) {
        await register(formData.username, formData.email, formData.password);
      } else {
        await login(formData.email, formData.password);
      }
      router.push("/home"); // ✅ redirige vers la page principale après succès
    } catch (err) {
      setError(err.message || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-base-200 p-6">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body">
          {/* Header */}
          <div className="text-center mb-6 space-y-1">
            <h1 className="text-3xl font-extrabold text-primary">
              🎵 BlindTest Arena
            </h1>
            <p className="text-base-content/70 text-sm">
              {isSignUp
                ? "Rejoins la compétition en créant ton compte !"
                : "Connecte-toi et poursuis l’aventure musicale."}
            </p>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {isSignUp && (
              <input
                type="text"
                name="username"
                placeholder="Pseudo"
                className="input input-bordered w-full"
                value={formData.username}
                onChange={handleChange}
                required
              />
            )}

            <input
              type="email"
              name="email"
              placeholder="Adresse mail"
              className="input input-bordered w-full"
              value={formData.email}
              onChange={handleChange}
              required
            />

            <input
              type="password"
              name="password"
              placeholder="Mot de passe"
              className="input input-bordered w-full"
              value={formData.password}
              onChange={handleChange}
              required
            />

            {/* Message d’erreur */}
            {error && (
              <div className="alert alert-error py-2 px-3 text-sm">
                ⚠️ {error}
              </div>
            )}

            {/* Bouton principal */}
            <button
              type="submit"
              className={`btn btn-secondary w-full mt-3 font-semibold ${
                loading ? "loading" : ""
              }`}
              disabled={loading}
            >
              {isSignUp ? "Créer mon compte" : "Se connecter"}
            </button>
          </form>

          {/* Séparateur */}
          <div className="divider my-6"></div>

          {/* Toggle connexion / inscription */}
          <p className="text-center text-sm text-base-content/70">
            {isSignUp ? (
              <>
                Déjà un compte ?{" "}
                <button
                  type="button"
                  onClick={() => setIsSignUp(false)}
                  className="link link-primary font-semibold"
                >
                  Connecte-toi
                </button>
              </>
            ) : (
              <>
                Pas encore inscrit ?{" "}
                <button
                  type="button"
                  onClick={() => setIsSignUp(true)}
                  className="link link-primary font-semibold"
                >
                  Crée un compte
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </main>
  );
}
