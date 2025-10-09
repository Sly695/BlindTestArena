import { useState } from "react";

export default function ListePlayers() {
  const [players, setPlayers] = useState([
    { name: "Sly695", score: 15 },
    { name: "Alice", score: 12 },
    { name: "Bob", score: 9 },
  ]);

  return (
    <>
      {/* 👥 3️⃣ JOUEURS */}
      <div className="card bg-base-100 shadow-xl rounded-2xl p-6 flex flex-col">
        <h2 className="text-xl font-bold mb-4">👥 Joueurs connectés</h2>
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

        <div className="mt-4 text-sm text-center opacity-70">
          Partie : <span className="font-semibold">#ABX12</span> <br />
          Joueurs : {players.length} / 6
        </div>
      </div>
    </>
  );
}
