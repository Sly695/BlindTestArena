import { Music2 } from "lucide-react";
import { useState } from "react";

export default function HistoriqueRounds() {
  const [history, setHistory] = useState([
    { title: "Save Your Tears", artist: "The Weeknd" },
    { title: "Levitating", artist: "Dua Lipa" },
  ]);

  return (
    <>
      {/* 🕹️ 1️⃣ HISTORIQUE */}
      <div className="card bg-base-100 shadow-xl rounded-2xl p-6 flex flex-col ">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Music2 className="w-5 h-5 text-primary" /> Historique des rounds
        </h2>

        {history.length === 0 ? (
          <p className="text-center text-base-content/60 italic">
            Aucune musique jouée pour l’instant 🎵
          </p>
        ) : (
          <ul className="space-y-3 overflow-y-auto max-h-[70vh]">
            {history.map((song, i) => (
              <li
                key={i}
                className="flex justify-between items-center p-3 rounded-lg bg-base-200 hover:bg-base-300 transition-all"
              >
                <div>
                  <p className="font-semibold">{song.title}</p>
                  <p className="text-sm opacity-70">{song.artist}</p>
                </div>
                <span className="badge badge-primary">Round {i + 1}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
