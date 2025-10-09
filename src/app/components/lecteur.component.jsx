import { useEffect, useState } from "react";

export default function Lecteur() {
  const [progress, setProgress] = useState(0);

  // 🎶 Lecture audio + progression
  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => {
        setProgress((p) => {
          if (p >= 100) {
            clearInterval(interval);
            setIsPlaying(false);
            audio.pause();
            return 100;
          }
          return p + 2;
        });
      }, 1000);
      audio.play();
    } else {
      audio.pause();
    }

    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <>
      <div className="bg-base-200/40 rounded-xl p-4 flex items-center gap-4">
        <img
          src="https://i.scdn.co/image/ab67616d0000b2737f23a4a52e3d3baf739e1a09"
          alt="cover"
          className="w-20 h-20 rounded-lg object-cover shadow-lg"
        />
        <div className="flex-1">
          <h3 className="font-bold text-lg leading-tight">Blinding Lights</h3>
          <p className="text-sm text-base-content/70">The Weeknd</p>
          <div className="mt-2 w-full bg-base-300 rounded-full h-2 overflow-hidden">
            <div
              className="h-2 bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
        <button
          onClick={togglePlay}
          className="btn btn-circle btn-primary flex-shrink-0"
        >
          {isPlaying ? <Pause /> : <Play />}
        </button>
      </div>
    </>
  );
}
