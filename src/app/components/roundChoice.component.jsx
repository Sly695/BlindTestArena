"use client";
import { useState, useEffect, useRef } from "react";
import { Music, Mic2, Zap, Heart, Disc3, Radio, Flame } from "lucide-react";

export default function RoundChoice({ onVoteEnd, closeModal }) {
  const [selected, setSelected] = useState(null);
  const [countdown, setCountdown] = useState(10);
  const timerRef = useRef(null);

  const playlists = [
    { id: "9563400362", name: "Rap FR", icon: <Mic2 className="w-6 h-6" /> },
    { id: "1363560485", name: "Pop Internationale", icon: <Disc3 className="w-6 h-6" /> },
    { id: "751764391", name: "Années 2000", icon: <Radio className="w-6 h-6" /> },
    { id: "1306931615", name: "Rock", icon: <Flame className="w-6 h-6" /> },
    { id: "3153080842", name: "Afrobeat", icon: <Zap className="w-6 h-6" /> },
    { id: "10153594502", name: "Electro", icon: <Music className="w-6 h-6" /> },
  ];

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
  }, []);

  const finalizeVote = () => {
    clearInterval(timerRef.current);

    const finalPlaylist =
      selected || playlists[Math.floor(Math.random() * playlists.length)];

    onVoteEnd(finalPlaylist.id);
    closeModal();
  };

  
  const selectTheme = (playlistId) => {
    setSelected(playlistId);

    // ✔ stop timer dès qu'on clique
    clearInterval(timerRef.current);

    // ✔ finalise immédiatement AVEC le bon ID de playlist
    onVoteEnd(playlistId);
    closeModal();
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
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
