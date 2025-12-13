"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import io from "socket.io-client";

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
  const socketRef = useRef(null);

  const [displayMessage, setDisplayMessage] = useState(
    "La partie commence dans 3..."
  );
  const [startDisabled, setStartDisabled] = useState(false);
  const [game, setGame] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [currentRound, setCurrentRound] = useState(null);
  const [roundState, setRoundState] = useState("WAITING");
  const [chosenTheme, setChosenTheme] = useState(null);
  const creatingRound = useRef(false);
  const themeMessageRef = useRef(null);

  // -------------------------------------
  // Texte dynamique du header
  // -------------------------------------
  useEffect(() => {
    if (roundState === "WAITING") {
      setDisplayMessage("Choisissez un thème pour démarrer 🎵");
      setChosenTheme(null);
    }
    if (roundState === "STARTED") {
      // Ne pas écraser le message du thème choisi si on l'a déjà défini
      if (!themeMessageRef.current) {
        setDisplayMessage("🎧 Round en cours…");
      }
    }
    if (roundState === "FINISHED") setDisplayMessage("⏳ Round terminé !");
    if (roundState === "REVEALED") {
      setDisplayMessage("🔥 Réponse révélée !");
      themeMessageRef.current = null;
    }
  }, [roundState]);

  // -------------------------------------
  // Charger la partie
  // -------------------------------------
  useEffect(() => {
    const load = async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/games/${gameId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      setGame(data);
    };

    if (token && gameId) load();
  }, [token, gameId]);

  // -------------------------------------
  // WebSocket connexion
  // -------------------------------------
  useEffect(() => {
    if (!gameId) return;

    // Connexion au serveur WebSocket avec gameId en query param
    socketRef.current = io(process.env.NEXT_PUBLIC_API_WS_URL || "http://localhost:3001", {
      query: { gameId },
    });

    socketRef.current.on("connect", () => {
      console.log("✅ WebSocket connecté");
    });

    // Pause après reveal : afficher un décompte dans la navbar
    socketRef.current.on("round:pauseBeforeVote", (data) => {
      const seconds = data?.seconds || 5;
      setDisplayMessage(`Pause ${seconds}s avant le vote...`);

      let remaining = seconds;
      const tick = setInterval(() => {
        remaining -= 1;
        if (remaining > 0) {
          setDisplayMessage(`Pause ${remaining}s avant le vote...`);
        } else {
          clearInterval(tick);
        }
      }, 1000);
    });

    // Lancement automatique de la modale de vote
    socketRef.current.on("round:startThemeVote", (data) => {
      console.log("📢 Démarrage du vote:", data);
      setShowModal(true);
    });

    // Écouter les changements de phase (ex: THEME_SELECTION) pour ouvrir la modale
    socketRef.current.on("round:phaseChanged", (data) => {
      if (data?.phase === "THEME_SELECTION") {
        setShowModal(true);
        // si on arrive en phase de sélection, la partie est démarrée — désactiver Start
        setStartDisabled(true);
      }
      if (data?.phase === "PLAYING") {
        setStartDisabled(true);
      }
    });

    // Écouter la mise à jour globale du jeu (ex: status STARTED)
    socketRef.current.on("game:updated", (data) => {
      if (data?.status === "STARTED") {
        setStartDisabled(true);
      }
    });

    // 📡 ÉCOUTER l'ouverture de modale
    socketRef.current.on("modal:open", (data) => {
      console.log("📱 Modale reçue:", data);
      if (data.type === "THEME_SELECTION") {
        setShowModal(true); // 👈 S'affiche chez TOUS
      }
    });

    // Écouter les événements de round créé
    socketRef.current.on("round:created", (data) => {
      console.log("📡 Round créé reçu:", data);
      if (data.round) {
        setCurrentRound(data.round);
        setRoundState("STARTED");
        const duration = data.round.answerTime ?? 30;
        setTimeout(() => {
          setRoundState("FINISHED");
        }, duration * 1000);
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [gameId]);

  // -------------------------------------
  // Ouvrir la modale
  // -------------------------------------
  const playlistMap = {
    "9563400362": "Rap FR",
    "1363560485": "Pop Internationale",
    "751764391": "Années 2000",
    "1306931615": "Rock",
    "3153080842": "Afrobeat",
    "10153594502": "Electro",
  };

  const openThemeModal = () => {
    setShowModal(true);
    
    // ✅ Émettre à TOUS les joueurs
    if (socketRef.current) {
      socketRef.current.emit("modal:open", {
        gameId,
        type: "THEME_SELECTION",
      });
    }
  };

  // Le host clique sur Démarrer -> demande au serveur de démarrer la partie
  const handleStart = () => {
    if (!socketRef.current) return;
    // 1) Demander au serveur de démarrer la partie
    socketRef.current.emit("game:start", { gameId });
    // 2) En parallèle, demander l'ouverture de la modale pour TOUS (fallback rapide)
    socketRef.current.emit("modal:open", { gameId, type: "THEME_SELECTION" });

    // Désactiver localement le bouton pour éviter les doubles clics
    setStartDisabled(true);
    // Ouvrir immédiatement la modale pour l'hôte (optimistic UI)
    setShowModal(true);
  };

  // -------------------------------------
  // FIN DU VOTE → Démarre un nouveau round
  // -------------------------------------
  const handleThemeEnd = async (playlistId) => {
    if (creatingRound.current) return;
    creatingRound.current = true;

    // 📝 Récupérer le nom du thème choisi
    const themeName = playlistMap[playlistId] || "Thème inconnu";
    setChosenTheme(themeName);
    
    // 📢 Afficher immédiatement le message du thème
    setDisplayMessage(`✅ Le thème choisi est "${themeName}"`);
    themeMessageRef.current = themeName;

    setShowModal(false);

    try {
      // 1) Récupère une chanson aléatoire de la playlist
      const search = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/deezer/playlist/${playlistId}`
      );

      const track = await search.json();

      if (!search.ok) {
        console.error("Erreur Deezer :", track.error);
        alert("Impossible de trouver une musique pour ce thème !");
        creatingRound.current = false;
        return;
      }

      // 2) Création du round
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/games/${gameId}/rounds`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
        alert("Erreur lors de la création du round !");
        creatingRound.current = false;
        return;
      }

      setCurrentRound(data.round);

      // 📡 Émettre l'événement WebSocket pour notifier les autres joueurs
      if (socketRef.current) {
        socketRef.current.emit("round:created", {
          gameId,
          round: data.round,
        });
      }

      // 3) Lancer round
      setRoundState("STARTED");

      const duration = data.round.answerTime ?? 30;

      setTimeout(() => {
        setRoundState("FINISHED");
      }, duration * 1000);
    } catch (err) {
      console.error("Erreur round :", err);
      alert("Impossible de démarrer le round, réessaie !");
    }
  };
  // -------------------------------------
  // FINISHED → mettre à jour backend et aller vers REVEALED
  // -------------------------------------
  useEffect(() => {
    if (roundState !== "FINISHED" || !currentRound) return;

    // Update back
    fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/games/${gameId}/rounds/${currentRound.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "FINISHED" }),
      }
    ).catch((err) => console.error("Erreur PATCH FINISHED:", err));

    // Passer à REVEALED après 2s
    const t = setTimeout(() => {
      setRoundState("REVEALED");
    }, 2000);

    return () => clearTimeout(t);
  }, [roundState, currentRound, token, gameId]);

  // -------------------------------------
  // REVEALED → update back puis revenir à WAITING
  // -------------------------------------
  useEffect(() => {
    if (roundState !== "REVEALED" || !currentRound) return;

    // Update back
    fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/games/${gameId}/rounds/${currentRound.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "REVEALED" }),
      }
    ).catch((err) => console.error("Erreur PATCH REVEALED:", err));

    // Retour à WAITING après 3s
    const t = setTimeout(() => {
      setRoundState("WAITING");
      creatingRound.current = false;
    }, 3000);

    return () => clearTimeout(t);
  }, [roundState, currentRound, token, gameId]);

  // -------------------------------------
  // UI
  // -------------------------------------
  return (
    <main className="min-h-screen flex flex-col justify-center items-center bg-base-200 p-4 md:p-6">
      {/* Navbar */}
      <NavbarBlind
        game={game}
        onStart={handleStart}
        startDisabled={startDisabled}
        socket={socketRef.current}
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
          <ListePlayers />
        </div>
      </div>

      {/* Modale */}
      {showModal && (
        <dialog open className="modal modal-open">
          <div className="modal-box bg-base-100 rounded-2xl">
            <RoundChoice
              gameId={gameId}
              userId={user?.id}
              socket={socketRef.current}
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
