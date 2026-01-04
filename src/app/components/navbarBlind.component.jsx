import { Volume2, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import io from "socket.io-client";

const socket = io(process.env.NEXT_PUBLIC_API_WS_URL, {
  transports: ["websocket"],
});

export default function NavbarBlind({
  game,
  onStart,
  startDisabled,
  displayMessage,
}) {
  const [isQuitModalOpen, setIsQuitModalOpen] = useState(false);
  const { token, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const gameId = searchParams.get("gameId");

  const handleQuit = () => setIsQuitModalOpen(true);
  const gameIsFull = game?.players?.length === game?.maxPlayers;

  const confirmQuit = async () => {
    setIsQuitModalOpen(false);
    // Informer les autres joueurs en temps réel
    try {
      if (game && user?.id === game.hostId) {
        socket.emit("host:quit", { gameId, hostId: user.id });
      } else {
        socket.emit("player:left", { gameId, userId: user?.id });
      }
    } catch (e) {
      console.warn("Emission socket quit échouée:", e);
    }
    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/games/${gameId}/leave`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    router.push("/home");
  };

  return (
    <>
      <div className="w-full max-w-7xl">
        <div className="flex flex-row card bg-base-100 shadow-xl rounded-2xl px-6 py-4 items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Volume2 className="text-primary w-5 h-5" />
            <p className="text-lg font-semibold text-base-content">
              🎵 BlindTest Arena : {displayMessage}
            </p>
          </div>
          {game && user?.id === game.hostId && game.status === "WAITING" && (
            <div className="flex items-center gap-3 ml-auto mr-4">
              <div className="text-sm opacity-70">
                Joueurs: {game.players.length}/{game.maxPlayers}
              </div>
              <button
                onClick={onStart}
                disabled={startDisabled || game.players.length < game.maxPlayers}
                className={`btn btn-sm btn-success flex items-center gap-2 font-medium ${
                  startDisabled || game.players.length < game.maxPlayers
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
              >
                Démarrer
              </button>
            </div>
          )}
          <button
            onClick={handleQuit}
            className="btn btn-sm btn-error flex items-center gap-2 font-medium"
          >
            <LogOut size={16} />
            Quitter
          </button>
        </div>
      </div>

      {/* 💬 MODALE QUITTER */}
      {isQuitModalOpen && (
        <dialog open className="modal modal-open">
          <div className="modal-box bg-base-100 rounded-2xl shadow-2xl">
            <h3 className="font-bold text-lg text-error flex items-center gap-2">
              <LogOut size={18} /> Quitter la partie
            </h3>
            <p className="py-3 text-base-content/80">
              Es-tu sûr de vouloir quitter la partie ?
              <br /> Les autres joueurs continueront sans toi.
            </p>

            <div className="modal-action flex justify-end gap-3">
              <button
                className="btn btn-ghost"
                onClick={() => setIsQuitModalOpen(false)}
              >
                Annuler
              </button>
              <button
                className="btn btn-error text-white"
                onClick={confirmQuit}
              >
                Oui, quitter
              </button>
            </div>
          </div>

          <form
            method="dialog"
            className="modal-backdrop bg-black/40 backdrop-blur-sm"
            onClick={() => setIsQuitModalOpen(false)}
          >
            <button>close</button>
          </form>
        </dialog>
      )}
    </>
  );
}
