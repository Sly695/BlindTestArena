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
import Podium from "../components/podium.component";

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
  const [podiumOpen, setPodiumOpen] = useState(false);
  const [podiumPlayers, setPodiumPlayers] = useState([]);

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
      // Désactiver Start si la partie n'est pas en attente
      if (data?.status && data.status !== "WAITING") {
        setStartDisabled(true);
      }
    };

    if (token && gameId) load();
  }, [token, gameId]);

  // -------------------------------------
  // WebSocket connexion
  // -------------------------------------
  useEffect(() => {
    if (!gameId) return;

    // Connexion au serveur WebSocket avec gameId en query param
    socketRef.current = io(
      process.env.NEXT_PUBLIC_API_WS_URL || "http://localhost:3001",
      {
        query: { gameId },
      }
    );

    socketRef.current.on("connect", () => {
      console.log("✅ WebSocket connecté");
    });

    // Synchroniser l'état dès la connexion
    socketRef.current.on("game:synced", ({ game, gameState, currentRound }) => {
      if (game?.status && game.status !== "WAITING") {
        setStartDisabled(true);
      }
      if (gameState?.roundPhase && gameState.roundPhase !== "THEME_SELECTION") {
        setStartDisabled(true);
      }
      
      // Restaurer le round actuel si un round est en cours
      if (currentRound) {
        console.log("🔄 Synchronisation du round actuel:", currentRound);
        setCurrentRound(currentRound);
        
        // Déterminer l'état du round en fonction de son status
        if (currentRound.status === "STARTED") {
          setRoundState("STARTED");
          
          // Calculer le temps restant
          const startedAt = new Date(currentRound.startsAt).getTime();
          const now = Date.now();
          const elapsed = Math.floor((now - startedAt) / 1000);
          const duration = currentRound.answerTime ?? 30;
          const remaining = Math.max(0, duration - elapsed);
          
          if (remaining > 0) {
            // Le round est toujours en cours
            setTimeout(() => {
              setRoundState("FINISHED");
            }, remaining * 1000);
          } else {
            // Le temps est écoulé, passer directement à FINISHED
            setRoundState("FINISHED");
          }
        } else if (currentRound.status === "FINISHED") {
          setRoundState("FINISHED");
        } else if (currentRound.status === "REVEALED") {
          setRoundState("REVEALED");
        }
      }
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
      // Si le serveur renvoie l'état complet, garder players à jour
      if (data?.players) {
        setGame((prev) => ({ ...(prev || {}), ...(data || {} ) }));
      }
    });

    // Mise à jour temps réel quand un joueur rejoint la room via chat
    socketRef.current.on("player_joined", (player) => {
      setGame((prev) => {
        if (!prev) return prev;
        const exists = prev.players?.some(
          (p) => (p.user?.id ?? p.userId ?? p.id) === player.id
        );
        const newPlayers = exists
          ? prev.players
          : [
              ...prev.players,
              { id: player.id, user: { id: player.id, username: player.username }, score: 0 },
            ];
        return { ...prev, players: newPlayers };
      });
    });

    // Mise à jour quand un joueur quitte (désactiver Start si non plein)
    socketRef.current.on("player_left", ({ userId }) => {
      setGame((prev) => {
        if (!prev?.players) return prev;
        const newPlayers = prev.players.filter(
          (p) => (p.user?.id ?? p.userId ?? p.id) !== userId
        );
        return { ...prev, players: newPlayers };
      });
    });

    // L'hôte a terminé la partie -> afficher pop-up et renvoyer au lobby
    socketRef.current.on("game:host_left", ({ message }) => {
      setDisplayMessage("Partie terminée par l’hôte");
      // simple modal inline via alert-style dialog
      const dialog = document.createElement("dialog");
      dialog.className = "modal modal-open";
      dialog.innerHTML = `
        <div class="modal-box bg-base-100 rounded-2xl">
          <h3 class="font-bold text-lg text-error">${message || "L’hôte a terminé la partie."}</h3>
          <p class="py-2">Retour au lobby...</p>
          <div class="modal-action">
            <button id="go-lobby" class="btn btn-error text-white">OK</button>
          </div>
        </div>
        <form method="dialog" class="modal-backdrop bg-black/40 backdrop-blur-sm"></form>
      `;
      document.body.appendChild(dialog);
      dialog.showModal();
      const go = () => {
        try { socketRef.current?.disconnect(); } catch {}
        window.location.href = "/home";
      };
      dialog.querySelector("#go-lobby")?.addEventListener("click", go);
      setTimeout(go, 2500);
    });

    // Fin de partie: ouvrir le podium avec les scores réels
    socketRef.current.on("game:finished", async (payload) => {
      const g = payload?.game;
      if (!g) return;

      const total = g.rounds ?? 0;
      const played = g.roundsData?.length ?? currentRound?.roundIndex ?? 0;
      setDisplayMessage(`Partie terminée — ${played}/${total}`);

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/games/${gameId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        const realPlayers = (data.players || []).map((p) => ({
          id: p.id,
          username: p.user?.username || p.username || "Joueur",
          score: p.score || 0,
        }));
        realPlayers.sort((a, b) => b.score - a.score);
        setPodiumPlayers(realPlayers);
      } catch (err) {
        console.error("Erreur chargement des scores réels:", err);
        // Fallback: utiliser le payload tel quel si disponible
        const fallbackPlayers = (g.players || [])
          .map((p) => ({
            id: p.id,
            username: p.user?.username || p.username || "Joueur",
            score: p.score || 0,
          }))
          .sort((a, b) => b.score - a.score);
        setPodiumPlayers(fallbackPlayers);
      }

      setPodiumOpen(true);
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
        if (game?.rounds) {
          setDisplayMessage(
            `Round ${data.round.roundIndex}/${game.rounds} en cours…`
          );
        }
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
    9563400362: "Rap FR",
    1363560485: "Pop Internationale",
    751764391: "Années 2000",
    1306931615: "Rock",
    3153080842: "Afrobeat",
    10153594502: "Electro",
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
    // Centralisation serveur: ne plus créer le round côté client
    // On affiche seulement le thème choisi et on ferme la modale.
    const themeName = playlistMap[playlistId] || "Thème inconnu";
    setChosenTheme(themeName);
    setDisplayMessage(`✅ Le thème choisi est "${themeName}"`);
    themeMessageRef.current = themeName;
    setShowModal(false);
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
          <ChatAnswer gameId={gameId} user={user} socket={socketRef.current} />
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

      {/* Podium */}
      {podiumOpen && (
        <Podium
          players={podiumPlayers}
          onQuit={async () => {
            try {
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
            } catch (e) {
              console.error("Erreur quit:", e);
            }
            if (socketRef.current) socketRef.current.disconnect();
            router.push("/home");
          }}
          onClose={() => setPodiumOpen(false)}
        />
      )}
    </main>
  );
}
