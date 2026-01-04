"use client";
import { useEffect, useState } from "react";
import io from "socket.io-client";
import { useSearchParams } from "next/navigation";

export default function ListePlayers() {
  const searchParams = useSearchParams();
  const gameId = searchParams.get("gameId");

  const [players, setPlayers] = useState([]);
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gameCode, setGameCode] = useState(null);
  const [maxPlayers, setMaxPlayers] = useState(null);

  // 🔁 Récupère les joueurs du gameId
  const fetchPlayers = async () => {
    if (!gameId) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/games/${gameId}`
      );
      const data = await res.json();

      if (!res.ok)
        throw new Error(data.error || "Erreur de chargement des joueurs");

      setPlayers(
        data.players.map((p) => ({
          userId: p.user.id,
          name: p.user.username,
          score: p.score || 0,
        }))
      );
      setGameCode(data.code);
      setMaxPlayers(data.maxPlayers);
    } catch (err) {
      console.error("Erreur récupération des joueurs :", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ⚡ Récupère les joueurs au montage + refresh périodique
  useEffect(() => {
    fetchPlayers();
    const interval = setInterval(fetchPlayers, 5000); // toutes les 5 secondes
    // Connexion WebSocket pour mises à jour en temps réel
    const s = io(
      process.env.NEXT_PUBLIC_API_WS_URL || "http://localhost:3001",
      {
        transports: ["websocket"],
        query: { gameId },
      }
    );
    setSocket(s);

    s.on("score:updated", ({ userId, points }) => {
      // Met à jour localement le score du joueur sans attendre le polling
      setPlayers((prev) => {
        const copy = prev.map((p) => ({ ...p }));
        const idx = copy.findIndex((p) => p.userId === userId);
        // si on ne retrouve pas via id, on laisse le polling REST corriger
        if (idx !== -1) {
          copy[idx].score = (copy[idx].score || 0) + points;
        }
        return copy;
      });
    });

    return () => {
      clearInterval(interval);
      s.disconnect();
    };
  }, [gameId]);

  if (loading) {
    return (
      <div className="card bg-base-100 shadow-xl rounded-2xl p-6 text-center">
        <span className="loading loading-spinner text-primary"></span>
        <p className="mt-2 text-sm opacity-70">Chargement des joueurs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card bg-base-100 shadow-xl rounded-2xl p-6 text-center text-error">
        ⚠️ {error}
      </div>
    );
  }

  return (
    <div className="card bg-base-100 shadow-xl rounded-2xl p-6 flex flex-col">
      <h2 className="text-xl font-bold mb-4">👥 Joueurs connectés</h2>

      {players.length === 0 ? (
        <p className="text-center italic opacity-70">
          Aucun joueur pour l’instant...
        </p>
      ) : (
        <ul className="flex-1 overflow-y-auto space-y-3">
          {[...players]
            .sort((a, b) => b.score - a.score)
            .map((p, i) => (
              <li
                key={i}
                className="flex justify-between items-center bg-base-200 p-3 rounded-lg"
              >
                <span className="font-medium">
                  {i + 1}. {p.name}
                </span>
                <span className="badge badge-primary">{p.score} pts</span>
              </li>
            ))}
        </ul>
      )}

      <div className="mt-4 text-sm text-center opacity-70">
        Partie : <span className="font-semibold">#{gameCode}</span> <br />
        Joueurs : {players.length} / {maxPlayers}
      </div>
    </div>
  );
}
