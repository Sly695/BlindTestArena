"use client";
import { useAuth } from "@/context/AuthContext";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Redirige automatiquement vers /auth si aucun utilisateur n’est connecté
 */
export default function useProtectedRoute() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth"); // 🔒 Redirection immédiate
    }
  }, [user, loading, router]);
}
