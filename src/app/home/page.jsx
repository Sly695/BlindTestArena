"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { LogOut } from "lucide-react";
import useProtectedRoute from "@/hooks/useProtectedRoute";
import { io } from "socket.io-client";

export default function LobbyPage() {
  useProtectedRoute(); // 🔒 redirige si pas connecté
  const router = useRouter();
  const { user, logout, token } = useAuth();

  const [games, setGames] = useState([]);
  const [players, setPlayers] = useState([]);

  // 🧩 Modales
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [isErrorOpen, setIsErrorOpen] = useState(false);
  const [errorTitle, setErrorTitle] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // 🎮 Formulaire de création
  const [isPublic, setIsPublic] = useState(true);
  const [rounds, setRounds] = useState(5);
  const [maxPlayers, setMaxPlayers] = useState(2);

  // 🔑 Formulaire de join
  const [joinCode, setJoinCode] = useState("");

  const [visibility, setVisibility] = useState("PUBLIC");

  const [activeGame, setActiveGame] = useState(null);
  const [checkingGame, setCheckingGame] = useState(true);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isCreateOpen) {
      setIsPublic(true);
      setRounds(5);
    }
  }, [isCreateOpen]);

  useEffect(() => {
    fetchGames();

    // 🔁 Rafraîchit toutes les 10 secondes
    const interval = setInterval(fetchGames, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!token) return;

    const checkActiveGame = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/me/game`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const data = await res.json();

        if (data?.game) {
          setActiveGame(data.game);
        } else {
          setActiveGame(null);
        }
      } catch (error) {
        console.error("Erreur vérification partie active :", error);
      } finally {
        setCheckingGame(false);
      }
    };

    checkActiveGame();
  }, [token]);

  const handleCreateGame = async (e) => {
    e.preventDefault();

    if (!token) {
      alert("Tu dois être connecté pour créer une partie !");
      return;
    }

    setLoading(true);

    try {
      const visibilityValue = isPublic ? "PUBLIC" : "PRIVATE";

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/games`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          visibility: visibilityValue,
          rounds: Number(rounds),
          maxPlayers: Number(maxPlayers),
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Erreur lors de la création");

      if (res.ok && data?.game) {
        const game = data.game;

        // 🔌 connexion socket persistante
        const socket = io(
          process.env.NEXT_PUBLIC_API_WS_URL || "http://localhost:3001",
          {
            transports: ["websocket"],
          }
        );

        socket.on("connect", () => {
          console.log("🟢 Connecté WS, création de la room...");

          // 🏠 Création de la room pour cette partie
          socket.emit("create_game", {
            gameId: game.id,
            host: { id: user?.id, username: user?.username },
          });

          // optionnel : écouter confirmation serveur
          socket.on("room_created", (room) => {
            console.log("✅ Room créée :", room);
          });

          // redirection vers la page de jeu
          router.push(`/blind?gameId=${game.id}`);
        });
      }

      setIsCreateOpen(false);

      // 🧩 Vérifie que l’API a bien renvoyé un gameId avant redirection
      const gameId = data?.game?.id;
      if (gameId) {
        router.push(`/blind?gameId=${gameId}`);
      } else {
        console.error(
          "Erreur lors de la redirection — gameId introuvable :",
          data
        );
      }

      // pas de else → on ne fait rien si pas d'id
    } catch (err) {
      console.error("Erreur création partie :", err);
      alert(err.message || "Erreur serveur");
    } finally {
      setLoading(false);
    }
  };

  const fetchGames = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/games`);
      const data = await res.json();
      setGames(data);
    } catch (err) {
      console.error("Erreur récupération des parties :", err);
    }
  };

  // 🧠 Rejoindre une partie (publique ou privée)
  const handleJoinGame = async (e, codeParam = null) => {
    if (e) e.preventDefault();

    const gameCode = codeParam || joinCode.trim();
    if (!gameCode) return alert("Veuillez saisir un code de partie.");

    if (!token)
      return alert("Tu dois être connecté pour rejoindre une partie !");

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/games/join`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ code: gameCode }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        const msg = data.error || "Erreur lors de la connexion à la partie";
        // Affiche une modale soignée pour 'Partie terminée'
        setIsJoinOpen(false);
        setErrorTitle(
          msg.toLowerCase().includes("terminée")
            ? "Partie terminée"
            : "Impossible de rejoindre"
        );
        setErrorMessage(
          msg.toLowerCase().includes("terminée")
            ? "Cette partie a été terminée par l’hôte. Tu ne peux plus la rejoindre."
            : msg
        );
        setIsErrorOpen(true);
        return;
      }

      // ✅ Redirection vers la page du blind test
      console.log(data);
      setIsJoinOpen(false);
      setTimeout(() => {
        router.push(`/blind?gameId=${data.game?.id || data?.id}`);
      }, 150);
    } catch (err) {
      console.error("Erreur handleJoinGame :", err);
      setIsJoinOpen(false);
      const msg = err.message || "Erreur serveur";
      setErrorTitle(
        msg.toLowerCase().includes("terminée")
          ? "Partie terminée"
          : "Erreur"
      );
      setErrorMessage(
        msg.toLowerCase().includes("terminée")
          ? "Cette partie a été terminée par l’hôte. Tu ne peux plus la rejoindre."
          : msg
      );
      setIsErrorOpen(true);
    }
  };

  return (
    <>
    <main className="min-h-screen flex flex-col items-center justify-center bg-base-200 p-6">
      {/* 🌟 NAVBAR "Rejoindre la partie en cours" */}
      {!checkingGame && activeGame && (
        <nav className="fixed top-0 left-0 w-full bg-primary text-white shadow-md z-50">
          <div className="max-w-5xl mx-auto flex justify-between items-center px-6 py-3">
            <div className="flex items-center gap-3">
              <span className="text-xl font-semibold">🎵 BlindTest Arena</span>
              <span className="badge badge-accent text-sm">
                Partie en cours
              </span>
            </div>

            <button
              onClick={() => router.push(`/blind?gameId=${activeGame.id}`)}
              className="btn btn-sm btn-secondary text-white font-medium shadow-md hover:shadow-lg transition-all"
            >
              ➡️ Rejoindre la partie
            </button>
          </div>
        </nav>
      )}
      <div className="card relative w-full max-w-4xl bg-base-100 shadow-xl p-6 space-y-8">
        {/* 🔒 Bouton logout */}
        <button
          onClick={logout}
          className="absolute top-3 right-3 p-2 rounded-full hover:bg-error/10 text-base-content/60 hover:text-error transition-all"
          title="Se déconnecter"
        >
          <LogOut className="w-5 h-5" />
        </button>

        {/* HEADER */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-primary">
            🎵 BlindTest Arena
          </h1>
          <p className="text-base-content/70">
            Bienvenue,{" "}
            <span className="font-semibold text-primary">
              {user?.username || "inconnu"}
            </span>{" "}
            👋
            <br />
            Crée une partie ou rejoins une déjà existante !
          </p>
        </div>

        {/* ZONE D’ACTIONS */}
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="btn btn-primary w-60 text-lg"
          >
            ➕ Créer une partie
          </button>

          <button
            onClick={() => setIsJoinOpen(true)}
            className="btn btn-secondary w-60 text-lg"
          >
            🔑 Rejoindre une partie
          </button>
        </div>

        {/* GRIDS */}
        <div className="grid sm:grid-cols-1">
          {/* LISTE DES PARTIES */}
          <div>
            <div className="divider">
              🎮 Parties disponibles (
              {games?.filter(
                (game) =>
                  game.visibility === "PUBLIC" &&
                  game.players.length < game.maxPlayers // 👈 reste de la place
              ).length || 0}
              )
            </div>
            {games.length === 0 ? (
              <p className="text-center text-base-content/70 italic">
                Aucune partie créée pour l’instant... sois le premier 🎮
              </p>
            ) : (
              <ul className="grid grid-cols-1 gap-3">
                {Array.isArray(games) && games.length > 0 ? (
                  games
                    .filter((game) => game.players.length < game.maxPlayers)
                    .map((game) => (
                      <li
                        key={game.id}
                        onClick={() => handleJoinGame(null, game.code)}
                        className="cursor-pointer p-4 bg-base-200 rounded-xl shadow-sm hover:shadow-md hover:bg-base-300 transition-all flex flex-col items-center justify-center"
                      >
                        <span className="font-semibold text-lg">
                          {game.host}
                        </span>
                        <span className="badge badge-primary mt-2">
                          Code: {game.code}
                        </span>

                        <span className="text-xs mt-1 opacity-70">
                          {game.visibility === "PUBLIC"
                            ? "Partie publique"
                            : "Partie privée"}{" "}
                          • {game.rounds} rounds
                        </span>
                        <div className="mt-2 text-sm text-base-content/70">
                          👥 {game.playersCount}/{game.maxPlayers} joueur
                          {game.playersCount > 1 ? "s" : ""}
                        </div>
                      </li>
                    ))
                ) : (
                  <p className="text-center text-base-content/70 italic">
                    Aucune partie disponible.
                  </p>
                )}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* 🎮 MODALE CRÉER PARTIE */}
      {isCreateOpen && (
        <dialog className="modal modal-open">
          <div className="modal-box bg-base-100 rounded-2xl shadow-2xl">
            <h3 className="font-bold text-xl mb-2 text-primary flex items-center gap-2">
              🎮 Créer une nouvelle partie
            </h3>
            <p className="text-sm text-base-content/70 mb-5">
              Configure les paramètres avant de lancer ton BlindTest.
            </p>

            <form onSubmit={handleCreateGame} className="space-y-5">
              {/* 🌍 Visibilité */}
              <div>
                <label className="label mb-2">
                  <span className="label-text font-medium">Visibilité</span>
                </label>
                <div className="flex items-center gap-6">
                  <label className="label cursor-pointer flex items-center gap-2">
                    <input
                      type="radio"
                      name="visibility"
                      className="radio radio-primary"
                      checked={isPublic}
                      onChange={() => setIsPublic(true)}
                    />
                    <span className="label-text">Publique</span>
                  </label>
                  <label className="label cursor-pointer flex items-center gap-2">
                    <input
                      type="radio"
                      name="visibility"
                      className="radio radio-secondary"
                      checked={!isPublic}
                      onChange={() => setIsPublic(false)}
                    />
                    <span className="label-text">Privée</span>
                  </label>
                </div>
              </div>

              {/* 🔢 Rounds */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">
                    Nombre de rounds (1 à 20)
                  </span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={rounds}
                  onChange={(e) => setRounds(Number(e.target.value))}
                  className="input input-bordered w-full focus:ring-2 focus:ring-primary transition-all"
                  placeholder="Ex : 10"
                  required
                />
              </div>

              {/* 👥 Joueurs max */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">
                    Nombre maximum de joueurs (2 à 45)
                  </span>
                </label>
                <input
                  type="number"
                  min="2"
                  max="45"
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(Number(e.target.value))}
                  className="input input-bordered w-full focus:ring-2 focus:ring-secondary transition-all"
                  placeholder="Ex : 8"
                  required
                />
              </div>

              {/* 🧭 Actions */}
              <div className="modal-action flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="btn btn-ghost"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn btn-primary text-white"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    "Créer la partie"
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Overlay */}
          <form
            method="dialog"
            className="modal-backdrop bg-black/40 backdrop-blur-sm"
            onClick={() => setIsCreateOpen(false)}
          >
            <button>close</button>
          </form>
        </dialog>
      )}
      {/* 🔑 MODALE REJOINDRE PARTIE */}
      {isJoinOpen && (
        <dialog className="modal modal-open">
          <div className="modal-box bg-base-100 rounded-2xl shadow-2xl">
            <h3 className="font-bold text-xl mb-2 text-secondary flex items-center gap-2">
              🔑 Rejoindre une partie privée
            </h3>
            <p className="text-sm text-base-content/70 mb-5">
              Entre le code à 5 caractères pour rejoindre une partie en cours.
            </p>

            <form onSubmit={(e) => handleJoinGame(e)} className="space-y-5">
              {/* 🧩 Code de la partie */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">
                    Code de la partie
                  </span>
                </label>
                <input
                  type="text"
                  placeholder="Ex : ABCDE"
                  className="input input-bordered w-full uppercase text-left tracking-widest text-lg font-semibold focus:ring-secondary transition-all"
                  maxLength={5}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  required
                />
              </div>

              {/* 🎮 Actions */}
              <div className="modal-action flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsJoinOpen(false)}
                  className="btn btn-ghost"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn btn-secondary text-white"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    "Rejoindre"
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Overlay */}
          <form
            method="dialog"
            className="modal-backdrop bg-black/40 backdrop-blur-sm"
            onClick={() => setIsJoinOpen(false)}
          >
            <button>close</button>
          </form>
        </dialog>
      )}
    </main>
    {/* ❌ MODALE ERREUR JOIN */}
    {isErrorOpen && (
      <dialog className="modal modal-open">
        <div className="modal-box bg-base-100 rounded-2xl shadow-2xl">
          <h3 className="font-bold text-lg text-error">{errorTitle}</h3>
          <p className="py-3 text-base-content/80">{errorMessage}</p>
          <div className="modal-action">
            <button className="btn btn-error text-white" onClick={() => setIsErrorOpen(false)}>
              OK
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop bg-black/40 backdrop-blur-sm" onClick={() => setIsErrorOpen(false)}>
          <button>close</button>
        </form>
      </dialog>
    )}
    </>
  );
}
