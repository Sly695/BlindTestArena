"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // 🔹 Charger le token et le profil au démarrage
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (storedToken) {
      setToken(storedToken);
      fetchProfile(storedToken);
    } else {
      setLoading(false);
    }
  }, []);

  // 🧠 Récupérer le profil utilisateur
  const fetchProfile = async (authToken = token) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        setUser(null);
        localStorage.removeItem("token");
      }
    } catch (error) {
      console.error("Erreur fetchProfile:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // 🔑 Connexion utilisateur
  const login = async (email, password) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (res.ok && data.token) {
      localStorage.setItem("token", data.token);
      setToken(data.token);
      await fetchProfile(data.token);
    } else {
      throw new Error(data.error || "Erreur de connexion");
    }
  };

  // 🧍‍♂️ Inscription utilisateur
  const register = async (username, email, password) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });

    const data = await res.json();
    if (res.ok && data.token) {
      localStorage.setItem("token", data.token);
      setToken(data.token);
      await fetchProfile(data.token);
    } else {
      throw new Error(data.error || "Erreur d’inscription");
    }
  };

  // 🚪 Déconnexion
  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    router.push('/auth')
  };

  const value = { user, token, loading, login, register, logout };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// Hook d’accès pratique
export const useAuth = () => useContext(AuthContext);
