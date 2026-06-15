"use client";

import { useState } from "react";


export default function Home() {
  const [roomCode, setRoomCode] = useState("");

function createGame() {
  const code = Math.random()
    .toString(36)
    .substring(2, 7)
    .toUpperCase();

  window.location.href = `/game/${code}`;
}

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6">
      <h1 className="text-5xl font-bold">
        AI Picture Game
      </h1>

      <button
        onClick={createGame}
        className="bg-black text-white px-6 py-3 rounded-xl"
      >
        Create Game
      </button>

      <input
        value={roomCode}
        onChange={(e) => setRoomCode(e.target.value)}
        placeholder="Enter Room Code"
        className="border p-3 rounded-xl"
      />

<button
    onClick={() => {
     if (!roomCode) return;
      window.location.href = `/game/${roomCode.toUpperCase()}`;
    }}
    className="bg-blue-600 text-white px-6 py-3 rounded-xl"
>
    Join Game
  </button>
    </main>
  );
}