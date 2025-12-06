"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";

export default function HomePage() {
  const router = useRouter();
  const { user } = useAuth(); // ton contexte d’auth

  useEffect(() => {
    if (!user) {
      router.replace("/auth"); // redirection immédiate
    } else {
      router.replace("/dashboard"); // ou autre page
    }
  }, [user, router]);

  return null; // Pas besoin d'afficher quoi que ce soit ici
}
