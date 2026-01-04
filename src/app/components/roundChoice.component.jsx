"use client";
import { useState, useEffect, useRef } from "react";
import { Music, Mic2, Zap, Heart, Disc3, Radio, Flame } from "lucide-react";

export default function RoundChoice({ onVoteEnd, closeModal, gameId, userId, socket }) {
  const [selected, setSelected] = useState(null);
  const [countdown, setCountdown] = useState(10);
  const [votes, setVotes] = useState({}); // { playlistId: count, ... }
  const timerRef = useRef(null);

  const playlists = [
    { id: "9563400362", name: "Rap FR", icon: <Mic2 className="w-6 h-6" /> },
    { id: "1363560485", name: "Pop Internationale", icon: <Disc3 className="w-6 h-6" /> },
    { id: "751764391", name: "Années 2000", icon: <Radio className="w-6 h-6" /> },
    { id: "1306931615", name: "Rock", icon: <Flame className="w-6 h-6" /> },
    { id: "3153080842", name: "Afrobeat", icon: <Zap className="w-6 h-6" /> },
    { id: "10153594502", name: "Electro", icon: <Music className="w-6 h-6" /> },
  ];

  // 📡 Écouter les mises à jour de votes et le résultat final via la socket passée en props
  useEffect(() => {
    if (!socket) return;

    socket.on("votes:updated", (data) => {
      console.log("📊 Votes mis à jour:", data);
      setVotes(data.votes);
    });

    // 📢 Écouter le thème gagnant déterminé par le serveur
    socket.on("vote:finalized", (data) => {
      console.log("🏆 Thème finalisé par le serveur:", data);
      clearInterval(timerRef.current);
      
      // Trouver la playlist correspondante
      const winnerPlaylist = playlists.find(p => p.id === data.winnerPlaylistId);
      if (winnerPlaylist) {
        onVoteEnd(winnerPlaylist.id);
        closeModal();
      }
    });

    return () => {
      socket.off("votes:updated");
      socket.off("vote:finalized");
    };
  }, [socket, playlists, onVoteEnd, closeModal]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          finalizeVote();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    // Cleanup to prevent multiple intervals and ensure 1s steps
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const finalizeVote = () => {
    // ⏳ Ne rien faire ici - attendre que le serveur envoie vote:finalized
    console.log("⏳ En attente de la décision du serveur...");
  };

  
  const selectTheme = (playlistId) => {
    setSelected(playlistId);

    // 📡 Émettre le vote via WebSocket
    if (socket && gameId && userId) {
      socket.emit("vote:submitted", {
        gameId,
        userId,
        playlistId,
      });
    }

    // ❌ NE PAS fermer la modale immédiatement
    // La modale se ferme seulement quand le décompte termine
  };
  
return (
    <div className="p-6 flex flex-col gap-6">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-semibold">🗳️ Vote pour le thème du prochain round</h2>
        <div className="badge badge-primary text-white text-lg font-bold px-4 py-2">
          {countdown}s
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {playlists.map((playlist) => (
          <div
            key={playlist.id}
            onClick={() => selectTheme(playlist.id)}
            className={`cursor-pointer card bg-base-200 hover:bg-primary/10 border-2 transition-all duration-150 ${
              selected === playlist.id ? "border-primary scale-105" : "border-transparent"
            }`}
          >
            <div className="card-body items-center text-center gap-2 py-6">
              <div className="text-primary">{playlist.icon}</div>
              <h3 className="font-semibold text-base">{playlist.name}</h3>
              {/* 📊 Afficher le compteur de votes toujours */}
              <div className="text-sm font-semibold text-success">
                {votes[playlist.id] || 0} joueurs
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
