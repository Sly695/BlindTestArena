"use client";
import { Trophy, LogOut } from "lucide-react";

export default function Podium({ players = [], onQuit, onClose }) {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const top = sortedPlayers.slice(0, 3);
  const maxScore = Math.max(1, ...top.map((p) => p.score));

  return (
    <dialog open className="modal modal-open">
      <div className="modal-box bg-base-100 rounded-3xl shadow-2xl">
        <h3 className="font-bold text-lg mb-4">🏆 Classement final</h3>

        <ul className="space-y-3">
          {top.map((p, index) => {
            const ratio = Math.max(0.15, p.score / maxScore);

            return (
              <li key={p.userId} className="p-4 bg-base-200 rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">
                    #{index + 1} — {p.username}
                  </span>
                  <span className="font-bold">{p.score} pts</span>
                </div>

                <div className="h-2 bg-base-300 rounded-full mt-2">
                  <div
                    className="h-2 bg-primary rounded-full"
                    style={{ width: `${ratio * 100}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>

        <div className="flex justify-end gap-3 mt-6">
          <button className="btn btn-ghost" onClick={onClose}>
            Fermer
          </button>
          <button className="btn btn-error" onClick={onQuit}>
            Quitter
          </button>
        </div>
      </div>
    </dialog>
  );
}
