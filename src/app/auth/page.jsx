"use client";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const { login, register } = useAuth();
  const router = useRouter();

  // 🧩 Schémas de validation Yup
  const validationSchema = Yup.object({
    username: isSignUp
      ? Yup.string()
          .min(3, "Minimum 3 caractères")
          .max(20, "Maximum 20 caractères")
          .required("Pseudo requis")
      : Yup.string(),
    email: Yup.string()
      .email("Adresse mail invalide")
      .required("Email requis"),
    password: Yup.string()
      .min(6, "Minimum 6 caractères")
      .required("Mot de passe requis"),
  });
  

  // 🚀 Gestion de la soumission
  const handleSubmit = async (values, { setSubmitting, setStatus }) => {
    setStatus(null);
    try {
      if (isSignUp) {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: values.username, email: values.email, password: values.password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erreur d'inscription");
        setStatus("Inscription réussie. Vérifie ton email pour activer le compte.");
        return; // ne pas rediriger immédiatement
      } else {
        try {
          await login(values.email, values.password);
        } catch (err) {
          setStatus(err.message || "Erreur de connexion");
          return;
        }
      }
      router.push("/home");
    } catch (err) {
      setStatus(err.message || "Une erreur est survenue");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-base-200 p-6">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body">
          {/* 🎵 Header */}
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

          {/* 🧾 Formulaire avec Formik */}
          <Formik
            initialValues={{
              username: "",
              email: "",
              password: "",
            }}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
            validateOnChange={false}
            validateOnBlur={true}
          >
            {({ isSubmitting, status }) => (
              <Form className="space-y-3" autoComplete="off">
                {/* Pseudo */}
                {isSignUp && (
                  <div className="form-control">
                    <Field
                      type="text"
                      name="username"
                      placeholder="Pseudo"
                      className="input input-bordered w-full"
                      autoComplete="off"
                      autoCapitalize="none"
                      spellCheck={false}
                    />
                    <ErrorMessage
                      name="username"
                      component="div"
                      className="text-error text-sm mt-1"
                    />
                  </div>
                )}

                {/* Email */}
                <div className="form-control">
                  <Field
                    type="email"
                    name="email"
                    placeholder="Adresse mail"
                    className="input input-bordered w-full"
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                  />
                  <ErrorMessage
                    name="email"
                    component="div"
                    className="text-error text-sm mt-1"
                  />
                </div>

                {/* Mot de passe */}
                <div className="form-control">
                  <Field
                    type="password"
                    name="password"
                    placeholder="Mot de passe"
                    className="input input-bordered w-full"
                    autoComplete={isSignUp ? "new-password" : "current-password"}
                    autoCapitalize="none"
                    spellCheck={false}
                  />
                  <ErrorMessage
                    name="password"
                    component="div"
                    className="text-error text-sm mt-1"
                  />
                  {!isSignUp && (
                    <div className="mt-2 text-right">
                      <a href="/auth/forgetPassword" className="link link-primary text-sm">Mot de passe oublié ?</a>
                    </div>
                  )}
                </div>

                {/* Message d’erreur global */}
                {status && (
                  <div className="alert alert-error py-2 px-3 text-sm">
                    ⚠️ {status}
                  </div>
                )}

                {/* Bouton principal */}
                <button
                  type="submit"
                  className={`btn btn-secondary w-full mt-3 font-semibold ${
                    isSubmitting ? "loading" : ""
                  }`}
                  disabled={isSubmitting}
                >
                  {isSignUp ? "Créer mon compte" : "Se connecter"}
                </button>
              </Form>
            )}
          </Formik>

          {/* Séparateur */}
          <div className="divider my-6"></div>

          {/* 🔁 Toggle connexion / inscription */}
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
