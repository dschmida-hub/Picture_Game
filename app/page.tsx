"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

const featureCards = [
  ["No app required", "Everyone joins from their phone with a room code."],
  ["AI makes the picture", "Your answer becomes an anonymous image for the table to judge."],
  ["Built for chaos", "Classic prompts, fill-in-the-blank cards, avatars, voting, and winners."],
];

const howItWorks = [
  ["1", "Create a room", "Host a game and share the code with friends."],
  ["2", "Answer the prompt", "Write something short, specific, and laughably wrong."],
  ["3", "Vote on images", "The funniest AI masterpiece wins the round."],
];

export default function Home() {
  const [roomCode, setRoomCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  function formatRoomCode(value: string) {
    return value.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 5);
  }

  function handleRoomCodeChange(value: string) {
    setRoomCode(formatRoomCode(value));
    setJoinError("");
  }

  function createGame() {
    const code = Math.random().toString(36).substring(2, 7).toUpperCase();
    window.location.href = `/game/${code}?create=1`;
  }

  async function joinGame() {
    const cleanCode = formatRoomCode(roomCode);
    if (!cleanCode) return;

    if (cleanCode.length !== 5) {
      setJoinError("Room codes are 5 letters or numbers.");
      return;
    }

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
    <main className="min-h-screen overflow-hidden bg-purple-50 text-black">
      <section className="relative px-5 py-8 md:px-8 md:py-12">
        <div className="absolute -left-24 top-20 h-72 w-72 rounded-full bg-purple-300/40 blur-3xl" />
        <div className="absolute -right-24 top-6 h-72 w-72 rounded-full bg-yellow-200/60 blur-3xl" />

        <div className="relative mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-8 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="text-center lg:text-left">
            <p className="mb-4 inline-flex rounded-full border border-purple-200 bg-white px-4 py-2 text-xs font-extrabold uppercase tracking-[0.25em] text-purple-700 shadow-sm">
              AI party game · 2-8 players · phone friendly
            </p>

            <h1 className="text-5xl font-black tracking-tight md:text-7xl">
              Your bad answers become
              <span className="mt-2 block -rotate-1 text-purple-600">even worse pictures.</span>
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-lg font-bold leading-relaxed text-gray-600 lg:mx-0">
              Picture This is a room-code party game where players write ridiculous answers,
              AI turns them into images, and everyone votes on the funniest disaster.
            </p>

            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
              <button
                type="button"
                onClick={createGame}
                className="rounded-2xl bg-black px-8 py-4 text-lg font-extrabold text-white shadow-xl transition active:scale-[0.99] md:hover:scale-[1.02]"
              >
                Start Free Game
              </button>
              <a
                href="#join"
                className="rounded-2xl border-2 border-purple-200 bg-white px-8 py-4 text-lg font-extrabold text-purple-700 shadow-sm transition active:scale-[0.99] md:hover:scale-[1.02]"
              >
                Join a Room
              </a>
            </div>

            <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {featureCards.map(([title, description]) => (
                <div key={title} className="rounded-2xl border border-purple-100 bg-white/90 p-4 shadow-sm">
                  <p className="font-black">{title}</p>
                  <p className="mt-1 text-sm font-bold text-gray-500">{description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border-4 border-black bg-white p-5 shadow-2xl md:p-6">
            <div className="rounded-[1.5rem] bg-gradient-to-br from-purple-700 to-black p-5 text-white">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.25em] text-purple-200">
                    Picture This
                  </p>
                  <h2 className="mt-1 text-3xl font-black">Game night, upgraded.</h2>
                </div>
                <div className="rounded-2xl bg-white px-3 py-2 text-3xl">🎨</div>
              </div>

              <div className="mt-5 rounded-2xl bg-white p-4 text-black shadow-lg">
                <p className="text-xs font-extrabold uppercase tracking-wider text-purple-600">
                  Prompt
                </p>
                <p className="mt-1 text-2xl font-black">A wedding speech no one should have approved</p>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/10 p-3">
                  <p className="text-xs font-extrabold uppercase text-purple-200">Answer</p>
                  <p className="mt-1 font-black">A raccoon with notes</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-3">
                  <p className="text-xs font-extrabold uppercase text-purple-200">Result</p>
                  <p className="mt-1 font-black">Everyone yells</p>
                </div>
              </div>
            </div>

            <div id="join" className="mt-5 rounded-3xl border border-purple-200 bg-purple-50 p-5">
              <p className="text-sm font-extrabold uppercase tracking-wider text-purple-700">
                Join friends
              </p>
              <h2 className="mt-1 text-2xl font-black">Enter a room code</h2>
              <label className="mt-4 block text-sm font-bold text-purple-700" htmlFor="room-code">
                Room code
              </label>
              <input
                id="room-code"
                value={roomCode}
                onChange={(event) => handleRoomCodeChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") joinGame();
                }}
                placeholder="ABCDE"
                inputMode="text"
                autoComplete="off"
                spellCheck={false}
                maxLength={5}
                className="mt-2 w-full rounded-2xl border-2 border-purple-200 bg-white p-4 text-center text-2xl font-black tracking-[0.3em] uppercase focus:border-purple-600 focus:outline-none"
              />
              <button
                type="button"
                onClick={joinGame}
                disabled={roomCode.length !== 5 || isJoining}
                className="mt-4 w-full rounded-2xl bg-purple-700 px-6 py-4 text-lg font-extrabold text-white shadow-lg disabled:opacity-50"
              >
                {isJoining ? "Checking Room..." : "Join Game"}
              </button>
              {joinError && (
                <p className="mt-3 text-center text-sm font-extrabold text-red-600">
                  {joinError}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 pb-10 md:px-8">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-5 lg:grid-cols-[1fr_0.8fr]">
          <div className="rounded-[2rem] border border-purple-200 bg-white p-6 shadow-xl">
            <p className="text-sm font-extrabold uppercase tracking-[0.25em] text-purple-600">
              How it works
            </p>
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
              {howItWorks.map(([number, title, description]) => (
                <div key={number} className="rounded-3xl bg-purple-50 p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-700 font-black text-white">
                    {number}
                  </div>
                  <h3 className="mt-4 text-xl font-black">{title}</h3>
                  <p className="mt-2 text-sm font-bold text-gray-600">{description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border-4 border-black bg-yellow-100 p-6 shadow-xl">
            <p className="text-sm font-extrabold uppercase tracking-[0.25em] text-yellow-700">
              Coming next
            </p>
            <h2 className="mt-2 text-3xl font-black">Party passes</h2>
            <p className="mt-3 font-bold text-gray-700">
              Free games stay available while paid party passes will unlock longer sessions,
              more rounds, and bigger group nights.
            </p>
            <div className="mt-5 rounded-2xl bg-white p-4">
              <p className="font-black">Early plan</p>
              <p className="mt-1 text-sm font-bold text-gray-600">
                Free trial · Party Pass · Party Night
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
