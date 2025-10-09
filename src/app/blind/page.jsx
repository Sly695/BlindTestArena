"use client";
import { useState, useEffect } from "react";
import { Play, Pause, Send, Music2, LogOut, Volume2 } from "lucide-react";
import ListePlayers from "../components/listePlayers.component";
import HistoriqueRounds from "../components/historiquesRounds.component";
import ChatAnswer from "../components/chatAnswer.component";
import NavbarBlind from "../components/navbarBlind.component";
import Lecteur from "../components/lecteur.component";

export default function BlindTestRoom() {
  const [isPlaying, setIsPlaying] = useState(false);

  const [audio] = useState(
    () => new Audio("https://www.w3schools.com/html/horse.mp3")
  );

  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");

 

  const togglePlay = () => setIsPlaying((p) => !p);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!answer.trim()) return;
    const correct = answer.toLowerCase().includes("blinding lights");
    setFeedback(correct ? "✅ Bonne réponse !" : "❌ Mauvaise réponse !");
    setAnswer("");
  };

  return (
    <main className="min-h-screen bg-base-200 flex flex-col items-center p-6">
      <NavbarBlind />

      {/* 🧩 CONTENU PRINCIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full max-w-7xl">
       <HistoriqueRounds />

        {/* 🎧 2️⃣ LECTEUR + CHAT */}
        <div className="card bg-base-100 shadow-xl rounded-2xl p-6 flex flex-col">
          <Lecteur />
          <ChatAnswer />
        </div>
        <ListePlayers />
      </div>
    </main>
  );
}
