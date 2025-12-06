import { NextResponse } from "next/server";

export async function GET(req, { params }) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { error: "ID de playlist requis" },
      { status: 400 }
    );
  }

  try {
    // Récupère la playlist depuis Deezer
    const playlistRes = await fetch(`https://api.deezer.com/playlist/${id}`);
    const playlistData = await playlistRes.json();

    if (!playlistData.id) {
      return NextResponse.json(
        { error: "Playlist non trouvée" },
        { status: 404 }
      );
    }

    // Récupère les 100 premières chansons
    const tracksRes = await fetch(`https://api.deezer.com/playlist/${id}/tracks?limit=100`);
    const tracksData = await tracksRes.json();

    if (!tracksData.data || tracksData.data.length === 0) {
      return NextResponse.json(
        { error: "Aucune chanson dans cette playlist" },
        { status: 404 }
      );
    }

    // Retourne une chanson aléatoire de la playlist
    const randomTrack = tracksData.data[
      Math.floor(Math.random() * tracksData.data.length)
    ];

    return NextResponse.json({
      name: randomTrack.title,
      artist: randomTrack.artist.name,
      preview_url: randomTrack.preview,
      cover: randomTrack.album.cover,
      spotify_url: randomTrack.link || null,
    });
  } catch (err) {
    console.error("❌ DEEZER PLAYLIST ERROR:", err);
    return NextResponse.json(
      { error: "Erreur lors de la récupération de la playlist" },
      { status: 500 }
    );
  }
}
