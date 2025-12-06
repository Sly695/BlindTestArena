"use client";
import { useEffect, useState, useRef } from "react";
import { Play, Pause, ExternalLink } from "lucide-react";

export default function Lecteur({ round, state }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const isHidden = state !== "REVEALED"; // 🎭 On masque tant que pas révélé

  // Prépare l'audio quand un nouveau round arrive
  useEffect(() => {
    if (!round || !round.previewUrl) return;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    audioRef.current = new Audio(round.previewUrl);
    setIsPlaying(false);
    setProgress(0);

    const audio = audioRef.current;
    const updateProgress = () => {
      setProgress((audio.currentTime / audio.duration) * 100 || 0);
    };

    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("ended", () => setIsPlaying(false));

    return () => {
      audio.removeEventListener("timeupdate", updateProgress);
      audio.removeEventListener("ended", () => setIsPlaying(false));
    };
  }, [round]);

  // Lecture / pause
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) audio.play();
    else audio.pause();
  }, [isPlaying]);

  if (!round)
    return <div className="text-center opacity-60">En attente du round…</div>;

  return (
    <div className="relative bg-base-200 rounded-xl p-4 flex gap-4 items-center">
      
      {/* Pochette floutée si cachée */}
      <div className="relative">
        <img
          src={round.coverUrl}
          className={`w-20 h-20 rounded-lg object-cover transition-all duration-300 ${
            isHidden ? "blur-md brightness-75" : ""
          }`}
        />

        {/* Overlay texte sur la pochette */}
        {isHidden && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-semibold text-base-content/70">
              🔒 En cours…
            </span>
          </div>
        )}
      </div>

      {/* Infos titre / artiste floutées */}
      <div className="relative flex-1">
        <p
          className={`font-bold truncate transition-all duration-300 ${
            isHidden ? "blur-sm select-none" : ""
          }`}
        >
          {isHidden ? "Titre caché" : round.songTitle}
        </p>

        <p
          className={`text-sm opacity-70 truncate transition-all duration-300 ${
            isHidden ? "blur-sm select-none" : ""
          }`}
        >
          {isHidden ? "Artiste caché" : round.artist}
        </p>

        {/* Barre de progression toujours visible */}
        <div className="mt-2 bg-base-300 h-2 rounded-full overflow-hidden">
          <div
            className="bg-primary h-2 transition-all"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Spotify visible seulement si révélé */}
      {!isHidden && (
        <a
          href={round.spotifyUrl}
          target="_blank"
          className="btn btn-ghost btn-circle"
        >
          <ExternalLink size={16} />
        </a>
      )}

      {/* Play / pause toujours dispo */}
      <button
        className="btn btn-primary btn-circle"
        onClick={() => setIsPlaying((p) => !p)}
      >
        {isPlaying ? <Pause /> : <Play />}
      </button>
    </div>
  );
}
