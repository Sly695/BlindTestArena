// /src/app/api/deezer/search/route.js
import { NextResponse } from "next/server";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");

  if (!q)
    return NextResponse.json({ error: "Missing q param" }, { status: 400 });

  try {
    const res = await fetch(
      `https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=25`
    );
    const data = await res.json();

    if (!data?.data?.length)
      return NextResponse.json({ error: "Aucun résultat trouvé" }, { status: 404 });

    // 🎯 Filtrer uniquement les pistes avec preview valide
    const playableTracks = data.data.filter((t) => !!t.preview);

    if (playableTracks.length === 0)
      return NextResponse.json({ error: "Aucune piste avec extrait audio" }, { status: 404 });

    // 🔀 Choisir une piste aléatoire pour varier les morceaux
    const randomTrack = playableTracks[Math.floor(Math.random() * playableTracks.length)];

    const clean = {
      id: randomTrack.id,
      name: randomTrack.title,
      artist: randomTrack.artist?.name,
      album: randomTrack.album?.title,
      cover: randomTrack.album?.cover_medium || randomTrack.album?.cover,
      preview_url: randomTrack.preview, // 🎧 30s d’extrait
      deezer_url: randomTrack.link,
    };

    return NextResponse.json(clean);
  } catch (error) {
    console.error("Erreur Deezer API:", error);
    return NextResponse.json({ error: "Erreur serveur Deezer" }, { status: 500 });
  }
}
