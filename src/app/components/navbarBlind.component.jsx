import { Play, Pause, Send, Music2, LogOut, Volume2 } from "lucide-react";
import { useState, useEffect } from "react";

export default function NavbarBlind() {
  const [countdown, setCountdown] = useState(3);
  const [displayMessage, setDisplayMessage] = useState(
    "La partie commence dans 3..."
  );

  const handleQuit = () => {
    if (confirm("Voulez-vous vraiment quitter la partie ?")) {
      window.location.href = "/home";
    }
  };

  // 🕒 Compte à rebours
  useEffect(() => {
    let timer;
    timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setDisplayMessage("La partie commence !");
          return 0;
        }
        setDisplayMessage(`La partie commence dans ${prev - 1}...`);
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      {/* 🧭 NAVBAR alignée */}
      <div className="w-full max-w-7xl">
        <div className="flex flex-row card bg-base-100 shadow-xl rounded-2xl px-6 py-4 flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Volume2 className="text-primary w-5 h-5" />
            <p className="text-lg font-semibold text-base-content">
              🎵 BlindTest Arena : {displayMessage}
            </p>
          </div>

          <button
            onClick={handleQuit}
            className="btn btn-sm btn-error flex items-center gap-2 font-medium"
          >
            <LogOut size={16} />
            Quitter
          </button>
        </div>
      </div>
    </>
  );
}
