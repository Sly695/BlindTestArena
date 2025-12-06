"use client";
import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Music2, Play, Pause } from "lucide-react";

export default function HistoriqueRounds() {
  const searchParams = useSearchParams();
  const gameId = searchParams.get("gameId");

  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const audioRef = useRef(null);
  const [activeId, setActiveId] = useState(null);
  const [progress, setProgress] = useState({});
  const [elapsed, setElapsed] = useState({});

  const revealedRounds = rounds.filter((r) => r.status === "REVEALED");

  const fetchRounds = async () => {
    if (!gameId) return;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/games/${gameId}/rounds`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur de chargement");

      setRounds(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRounds();
    const interval = setInterval(fetchRounds, 5000);
    return () => clearInterval(interval);
  }, [gameId]);

  const togglePlay = (round) => {
    if (activeId === round.id) {
      audioRef.current.pause();
      setActiveId(null);
      return;
    }

    if (audioRef.current) audioRef.current.pause();

    const audio = new Audio(round.previewUrl);
    audioRef.current = audio;
    setActiveId(round.id);

    audio.play();

    audio.ontimeupdate = () => {
      const pct = (audio.currentTime / audio.duration) * 100;
      setProgress((prev) => ({ ...prev, [round.id]: pct }));
      setElapsed((prev) => ({
        ...prev,
        [round.id]: Math.floor(audio.currentTime),
      }));
    };

    audio.onended = () => {
      setActiveId(null);
      setProgress((prev) => ({ ...prev, [round.id]: 0 }));
    };
  };

  const formatTime = (s) => {
    if (!s) return "0:00";
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (loading)
    return (
      <div className="card bg-base-100 p-6 text-center">
        <span className="loading loading-spinner text-primary"></span>
        <p className="mt-2 opacity-70">Chargement...</p>
      </div>
    );

  if (error)
    return (
      <div className="card bg-base-100 p-6 text-center text-error">
        ⚠️ {error}
      </div>
    );


  return (
    <div className="card bg-base-100 rounded-2xl p-4 flex flex-col h-full">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Music2 className="w-5 h-5 text-primary" /> Historique des rounds
      </h2>

      {revealedRounds.length === 0 ? (
        <p className="text-center italic opacity-60">
          Aucun round révélé pour l’instant 🎵
        </p>
      ) : (
        <ul className="space-y-4 overflow-y-auto max-h-[70vh] pr-1">
          {revealedRounds
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
            .map((r, i) => (
              <li
                key={r.id}
                className="p-3 rounded-xl bg-base-200 flex items-center gap-4"
              >
                {/* Pochette */}
                <img
                  src={r.coverUrl}
                  className="w-14 h-14 rounded-lg object-cover shadow-sm"
                />

                {/* Texte + progression */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate max-w-[140px] md:max-w-[180px]">
                    {r.songTitle}
                  </p>

                  <p className="text-xs opacity-70 truncate max-w-[140px] md:max-w-[180px]">
                    {r.artist}
                  </p>

                  <div className="mt-2 bg-base-300 h-1 rounded-full overflow-hidden">
                    <div
                      className="bg-primary h-1 transition-all"
                      style={{ width: `${progress[r.id] || 0}%` }}
                    />
                  </div>

                  <div className="text-xs text-right opacity-60">
                    {formatTime(elapsed[r.id])} / 0:30
                  </div>
                </div>

                <button
                  onClick={() => togglePlay(r)}
                  className="btn btn-primary btn-circle btn-sm"
                >
                  {activeId === r.id ? <Pause size={14} /> : <Play size={14} />}
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
