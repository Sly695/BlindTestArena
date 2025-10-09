"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { LogOut } from "lucide-react";
import useProtectedRoute from "@/hooks/useProtectedRoute";

export default function LobbyPage() {
  useProtectedRoute(); // 🔒 redirige si pas connecté
  const router = useRouter();
  const { user, logout, token } = useAuth();

  const [games, setGames] = useState([]);
  const [players, setPlayers] = useState([]);

  // 🧩 Modales
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);

  // 🎮 Formulaire de création
  const [isPublic, setIsPublic] = useState(true);
  const [rounds, setRounds] = useState(5);
  const [maxPlayers, setMaxPlayers] = useState(2);

  // 🔑 Formulaire de join
  const [joinCode, setJoinCode] = useState("");

  const [visibility, setVisibility] = useState("PUBLIC");

  const [loading, setLoading] = useState(false);

  console.log(token),
    // 🧍 Simulation des joueurs connectés
    useEffect(() => {
      const mockPlayers = [
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" },
        { id: 3, name: user?.username || "Sly695" },
      ];
      setPlayers(mockPlayers);
    }, [user]);

  useEffect(() => {
    if (!isCreateOpen) {
      setIsPublic(true);
      setRounds(5);
    }
  }, [isCreateOpen]);

  useEffect(() => {
    fetchGames();

    // 🔁 Rafraîchit toutes les 10 secondes
    const interval = setInterval(fetchGames, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateGame = async (e) => {
    e.preventDefault();
    if (!token) return alert("Tu dois être connecté pour créer une partie !");
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
          maxPlayers: Number(maxPlayers)
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de la création");

      setIsCreateOpen(false);
      router.push(`/blind?gameId=${data.game.id}`);
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

      if (!res.ok)
        throw new Error(
          data.error || "Erreur lors de la connexion à la partie"
        );

      // ✅ Redirection vers la page du blind test
      setIsJoinOpen(false);
      router.push(`/blind?gameId=${data.game.id}`);
    } catch (err) {
      console.error("Erreur handleJoinGame :", err);
      alert(err.message || "Erreur serveur");
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-base-200 p-6">
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
        <div className="grid sm:grid-cols-2 gap-8">
          {/* LISTE DES PARTIES */}
          <div>
            <div className="divider">
              🎮 Parties disponibles ({games.length})
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
                      <span className="font-semibold text-lg">{game.host}</span>
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

          {/* LISTE DES JOUEURS CONNECTÉS */}
          <div>
            <div className="divider">
              👥 Joueurs connectés ({players.length})
            </div>

            {players.length === 0 ? (
              <p className="text-center text-base-content/70 italic">
                Aucun joueur connecté...
              </p>
            ) : (
              <ul className="grid grid-cols-1 gap-3">
                {players.map((player) => (
                  <li
                    key={player.id}
                    className={`p-3 bg-base-200 rounded-xl flex items-center justify-between ${
                      player.name === user?.username
                        ? "border border-primary"
                        : ""
                    }`}
                  >
                    <span className="font-medium">{player.name}</span>
                    {player.name === user?.username && (
                      <span className="badge badge-primary text-xs">Toi</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* 🎮 MODALE CRÉER PARTIE */}
      {isCreateOpen && (
        <dialog className="modal modal-open">
          <div className="modal-box bg-base-100">
            <h3 className="font-bold text-lg mb-4">
              Créer une nouvelle partie
            </h3>
            <form onSubmit={handleCreateGame} className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="label cursor-pointer flex items-center gap-2">
                  <input
                    type="radio"
                    name="visibility"
                    className="radio radio-primary"
                    checked={isPublic}
                    onChange={() => setIsPublic(true)}
                  />
                  <span className="label-text">Partie publique</span>
                </label>
                <label className="label cursor-pointer flex items-center gap-2">
                  <input
                    type="radio"
                    name="visibility"
                    className="radio radio-secondary"
                    checked={!isPublic}
                    onChange={() => setIsPublic(false)}
                  />
                  <span className="label-text">Partie privée</span>
                </label>
              </div>

              <div>
                <label className="label">
                  <span className="label-text">Nombre de rounds</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={rounds}
                  onChange={(e) => setRounds(Number(e.target.value))}
                  className="input input-bordered w-full"
                />
                <input
                  type="number"
                  min="2"
                  max="45"
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(Number(e.target.value))}
                  className="input input-bordered w-full"
                />
              </div>

              <div className="modal-action">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? "Création..." : "Créer la partie"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="btn"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </dialog>
      )}

      {/* 🔑 MODALE REJOINDRE PARTIE */}
      {/* 🔑 MODALE REJOINDRE PARTIE */}
      {isJoinOpen && (
        <dialog className="modal modal-open">
          <div className="modal-box bg-base-100">
            <h3 className="font-bold text-lg mb-4">
              Rejoindre une partie privée
            </h3>

            <form
              onSubmit={(e) => handleJoinGame(e)} // ✅ on appelle bien notre fonction asynchrone
              className="space-y-4"
            >
              <input
                type="text"
                placeholder="Code de la partie"
                className="input input-bordered w-full uppercase"
                maxLength={5}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                required
              />

              <div className="modal-action">
                <button type="submit" className="btn btn-secondary">
                  Rejoindre
                </button>
                <button
                  type="button"
                  onClick={() => setIsJoinOpen(false)}
                  className="btn"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </dialog>
      )}
    </main>
  );
}
