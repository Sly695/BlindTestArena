import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";


export default function ChatAnswer() {
  const messagesEndRef = useRef(null);

  const [messages, setMessages] = useState([
    { user: "Alice", text: "C’est Blinding Lights !" },
    { user: "Bob", text: "Non c’est Starboy 😆" },
  ]);

  const [newMessage, setNewMessage] = useState("");

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setMessages((prev) => [...prev, { user: "Toi", text: newMessage }]);
    setNewMessage("");
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  return (
    <>
      {/* 💬 CHAT */}
      <div className="mt-8 flex flex-col flex-1 border-t border-base-300 pt-4">
        <h3 className="font-semibold text-lg mb-2">💬 Réponses en direct</h3>

        {/* Liste des messages */}
        <div
          className="flex-1 overflow-y-auto pr-2 space-y-1 scrollbar-thin scrollbar-thumb-base-300 scrollbar-track-transparent bg-base-200/40 rounded-lg p-2"
          style={{
            maxHeight: "200px", // hauteur fixe
            minHeight: "200px",
            fontSize: "0.8rem",
          }}
        >
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex items-center gap-1 ${
                msg.user === "Toi" ? "justify-end text-right" : "justify-start"
              }`}
            >
              <span
                className={`font-semibold ${
                  msg.user === "Toi" ? "text-primary" : "text-secondary"
                }`}
              >
                {msg.user} :
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
    </>
  );
}
