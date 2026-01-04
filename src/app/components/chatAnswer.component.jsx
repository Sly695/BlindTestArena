"use client";
import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { io } from "socket.io-client";

export default function ChatAnswer({ gameId, user }) {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [awardNotice, setAwardNotice] = useState(null);
  const messagesEndRef = useRef(null);

  // 🔌 Connexion WebSocket
  useEffect(() => {
    const s = io("http://localhost:3001", {
      transports: ["websocket"],
    });
    setSocket(s);

    // rejoindre la room correspondant à la partie
    s.emit("join_room", {
      gameId,
      player: { id: user?.id, username: user?.username },
    });

    // écouter les messages entrants
    s.on("new_message", (msg) => {
      if (msg.user.username === user?.username) return; // 👈 déjà affiché localement
      setMessages((prev) => [...prev, msg]);
    });

    // écouter les scores mis à jour
    s.on("score:updated", (payload) => {
      if (payload?.userId !== user?.id) return;
      const { points, awarded } = payload;
      let text = `+${points} points!`;
      if (awarded?.title && awarded?.artist) {
        text = "+30 points (titre + artiste)!";
      } else if (awarded?.title) {
        text = "+20 points (titre)!";
      } else if (awarded?.artist) {
        text = "+10 points (artiste)!";
      }
      setAwardNotice(text);
      setTimeout(() => setAwardNotice(null), 2500);
    });

    return () => s.disconnect();
  }, [gameId, user]);

  // 🔽 Scroll automatique vers le bas
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ✉️ Envoi message
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    if (!socket) return;

    const message = {
      gameId,
      user: { id: user?.id, username: user?.username },
      text: newMessage,
    };

    socket.emit("send_message", message); // envoi au serveur
    setMessages((prev) => [...prev, { ...message, self: true }]); // ajout local
    setNewMessage("");
  };

  return (
    <div className="mt-8 flex flex-col flex-1 border-t border-base-300">
      <h3 className="font-semibold text-lg mb-2">💬 Chat général</h3>

      {awardNotice && (
        <div className="alert alert-success mb-2">
          <span>{awardNotice}</span>
        </div>
      )}

      {/* Liste des messages */}
      <div
        className="flex-1 overflow-y-auto pr-2 space-y-1 scrollbar-thin scrollbar-thumb-base-300 scrollbar-track-transparent bg-base-200/40 rounded-lg p-2"
        style={{ maxHeight: "200px", minHeight: "200px", fontSize: "0.8rem" }}
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex items-center gap-1 ${
              msg.user.username === user?.username || msg.self
                ? "justify-end text-right"
                : "justify-start"
            }`}
          >
            <span
              className={`font-semibold ${
                msg.user.username === user?.username || msg.self
                  ? "text-primary"
                  : "text-secondary"
              }`}
            >
              {msg.user.username} :
            </span>
            <span className="truncate max-w-[70%] text-base-content/80">
              {msg.text}
            </span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Champ d’envoi */}
      <form
        onSubmit={handleSendMessage}
        className="mt-3 flex items-center gap-2"
      >
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Écris un message..."
          className="input input-bordered input-sm flex-1"
        />
        <button type="submit" className="btn btn-sm btn-primary">
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
