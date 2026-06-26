"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [roomCode, setRoomCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  function createGame() {
    const code = Math.random().toString(36).substring(2, 7).toUpperCase();
    window.location.href = `/game/${code}?create=1`;
  }

  async function joinGame() {
    const cleanCode = roomCode.trim().toUpperCase();
    if (!cleanCode) return;

    setJoinError("");
    setIsJoining(true);

    try {
      const [{ count: playerCount, error: playerError }, { count: gameCount, error: gameError }] =
        await Promise.all([
          supabase
            .from("players")
            .select("id", { count: "exact", head: true })
            .eq("room_code", cleanCode),
          supabase
            .from("games")
            .select("id", { count: "exact", head: true })
            .eq("room_code", cleanCode),
        ]);

      if (playerError || gameError) {
        console.error(playerError || gameError);
        setJoinError("Could not check that room. Try again.");
        return;
      }

      if ((playerCount || 0) === 0 && (gameCount || 0) === 0) {
        setJoinError("Game not found. Check the code and try again.");
        return;
      }

    window.location.href = `/game/${cleanCode}`;
    } finally {
      setIsJoining(false);
    }
  }

  return (
    <main className="min-h-screen bg-purple-50 px-6 py-10 text-black">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl flex-col justify-center gap-10">
        <section className="text-center">
          <p className="mb-3 text-sm font-extrabold uppercase tracking-[0.25em] text-purple-600">
            An AI party game
          </p>
          <h1 className="text-5xl font-black tracking-tight md:text-7xl">
            <span className="inline-block -rotate-2 text-purple-600">Picture</span>{" "}
            <span className="inline-block rotate-2 rounded-2xl bg-black px-4 py-1 text-white">
              This
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-gray-600">
            Write the punchline. Let AI make it ridiculous. Vote for the image that makes everyone laugh first.
          </p>
        </section>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-3xl bg-black p-7 text-white shadow-2xl">
            <p className="text-sm font-extrabold uppercase tracking-wider text-purple-300">Host a game</p>
            <h2 className="mt-2 text-3xl font-black">Start the chaos</h2>
            <p className="mt-3 text-gray-300">
              Create a room, invite up to seven friends, and choose your round settings.
            </p>
            <button
              onClick={createGame}
              className="mt-6 w-full rounded-2xl bg-purple-600 px-6 py-4 text-lg font-extrabold shadow-lg"
            >
              Create a Game
            </button>
          </div>

          <div className="rounded-3xl border border-purple-200 bg-white p-7 shadow-xl">
            <p className="text-sm font-extrabold uppercase tracking-wider text-purple-600">Join friends</p>
            <h2 className="mt-2 text-3xl font-black">Enter a room</h2>
            <p className="mt-3 text-gray-600">Have a code? Jump straight into the lobby.</p>
            <label className="mt-6 block text-sm font-bold text-purple-700" htmlFor="room-code">
              Room code
            </label>
            <input
              id="room-code"
              value={roomCode}
              onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
              onKeyDown={(event) => {
                if (event.key === "Enter") joinGame();
              }}
              placeholder="ABCDE"
              maxLength={5}
              className="mt-2 w-full rounded-2xl border-2 border-purple-200 p-4 text-center text-2xl font-black tracking-[0.3em] uppercase focus:border-purple-600 focus:outline-none"
            />
            <button
              onClick={joinGame}
              disabled={!roomCode.trim() || isJoining}
              className="mt-4 w-full rounded-2xl bg-black px-6 py-4 text-lg font-extrabold text-white disabled:opacity-50"
            >
              {isJoining ? "Checking Room..." : "Join Game"}
            </button>
            {joinError && (
              <p className="mt-3 text-center text-sm font-extrabold text-red-600">
                {joinError}
              </p>
            )}
          </div>
        </section>

        <p className="text-center text-sm font-bold text-purple-700">
          2–8 players · Classic prompts or Fill in the Blank · AI-generated mayhem
        </p>
      </div>
    </main>
  );
}
