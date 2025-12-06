"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useGameSocket } from "@/hooks/useGameSocket";

import ListePlayers from "../components/listePlayers.component";
import HistoriqueRounds from "../components/historiquesRounds.component";
import ChatAnswer from "../components/chatAnswer.component";
import NavbarBlind from "../components/navbarBlind.component";
import Lecteur from "../components/lecteur.component";
import RoundChoice from "../components/roundChoice.component";

export default function BlindTestRoom() {
  const { token, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const gameId = searchParams.get("gameId");

  // ========== STATE ==========
  const [displayMessage, setDisplayMessage] = useState("Connexion en cours...");
  const [game, setGame] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [currentRound, setCurrentRound] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const timerRef = useRef(null);

  // ========== WEBSOCKET ==========
  const {
    connected,
    players,
    roundState,
    votes,
    answers,
    scores,
    startGame,
    voteTheme,
    startMusic,
    submitAnswer,
    revealAnswer,
    leaveGame,
  } = useGameSocket(gameId, user?.id, user?.name);

  // ========== CHARGER LA PARTIE (initial) ==========
  useEffect(() => {
    if (!gameId || !token) return;

    const loadGame = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/games/${gameId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        setGame(data);
      } catch (err) {
        console.error("❌ Erreur chargement jeu:", err);
      }
    };

    loadGame();
  }, [gameId, token]);

  // ========== MISE À JOUR DU MESSAGE ==========
  useEffect(() => {
    if (!connected) setDisplayMessage("Connexion WebSocket...");
    else if (roundState === "THEME_SELECTION")
      setDisplayMessage("🗳️ Vote pour le thème");
    else if (roundState === "PLAYING")
      setDisplayMessage(`🎧 Round en cours... ${timeRemaining}s`);
    else if (roundState === "REVEALED")
      setDisplayMessage("🔥 Réponse révélée !");
    else setDisplayMessage("En attente...");
  }, [roundState, connected, timeRemaining]);

  // ========== TIMER POUR LA MUSIQUE ==========
  useEffect(() => {
    if (roundState !== "PLAYING") {
      setTimeRemaining(30);
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          // Automatiquement passer à REVEALED
          handleMusicEnd();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [roundState]);

  // ========== GESTION DU THÈME SÉLECTIONNÉ ==========
  const handleThemeEnd = async (playlistId) => {
    setShowModal(false);

    try {
      // 1) Récupère une chanson de la playlist
      const search = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/deezer/playlist/${playlistId}`
      );
      const track = await search.json();

      if (!search.ok) {
        alert("Impossible de trouver une musique!");
        return;
      }

      // 2) Crée le round en BD
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/games/${gameId}/rounds`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            songTitle: track.name,
            artist: track.artist,
            previewUrl: track.preview_url,
            coverUrl: track.cover,
            spotifyUrl: track.spotify_url,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert("Erreur lors de la création du round!");
        return;
      }

      setCurrentRound(data.round);

      // 3) Lance la musique via WebSocket (sync tous les joueurs)
      startMusic(track.name, track.artist, track.preview_url);
    } catch (err) {
      console.error("❌ Erreur:", err);
      alert("Erreur, réessaie!");
    }
  };

  // ========== QUAND LA MUSIQUE SE TERMINE ==========
  const handleMusicEnd = async () => {
    if (!currentRound) return;

    // Met à jour le statut en BD
    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/games/${gameId}/rounds/${currentRound.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "FINISHED" }),
      }
    ).catch((err) => console.error("❌ Erreur PATCH:", err));

    // Notifie via WebSocket
    revealAnswer(
      `${currentRound.songTitle} - ${currentRound.artist}`,
      scores
    );
  };

  // ========== AUTO-OUVRE LA MODALE AU BON MOMENT ==========
  useEffect(() => {
    if (roundState === "THEME_SELECTION" && !showModal && connected) {
      setShowModal(true);
    }
  }, [roundState, connected]);

  // ========== AUTO PASSE AU ROUND SUIVANT APRÈS RÉVÉLATION ==========
  useEffect(() => {
    if (roundState !== "REVEALED") return;

    const timer = setTimeout(() => {
      // Vérifie si on a plus de rounds
      if (game && currentRound?.roundIndex < game.maxRounds) {
        // Lance un nouveau round
        voteTheme("908622995"); // Playlist par défaut, sera remplacée par le vote
      } else {
        // Partie terminée
        alert("🏆 Partie terminée!");
        router.push("/");
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [roundState]);

  // ========== AFFICHAGE ==========
  if (!connected) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-base-200">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg"></div>
          <p className="mt-4">Connexion WebSocket...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col justify-center items-center bg-base-200 p-4 md:p-6">
      {/* Navbar */}
      <NavbarBlind
        game={game}
        onOpenRoundChoice={() => setShowModal(true)}
        displayMessage={displayMessage}
      />

      {/* Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-7xl">
        {/* Historique */}
        <div className="card bg-base-100 shadow-xl rounded-2xl p-6">
          <HistoriqueRounds />
        </div>

        {/* Lecteur + réponses */}
        <div className="card bg-base-100 shadow-xl rounded-2xl p-6 flex flex-col gap-6">
          <Lecteur round={currentRound} state={roundState} />
          <ChatAnswer gameId={gameId} user={user} />
        </div>

        {/* Joueurs */}
        <div className="card bg-base-100 shadow-xl rounded-2xl p-6">
          <ListePlayers players={players} />
        </div>
      </div>

      {/* Modale */}
      {showModal && (
        <dialog open className="modal modal-open">
          <div className="modal-box bg-base-100 rounded-2xl">
            <RoundChoice
              onVoteEnd={handleThemeEnd}
              closeModal={() => setShowModal(false)}
            />
          </div>

          <form
            method="dialog"
            className="modal-backdrop bg-black/40 backdrop-blur-sm"
          >
            <button onClick={() => setShowModal(false)}>close</button>
          </form>
        </dialog>
      )}
    </main>
  );
}
