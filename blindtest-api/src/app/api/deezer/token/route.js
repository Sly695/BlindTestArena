import { NextResponse } from "next/server";

export async function GET() {
  const auth = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString("base64");

  try {
    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Spotify token error:", data);
      return NextResponse.json({ error: "Spotify token error" }, { status: 500 });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error("Spotify token fetch failed:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
