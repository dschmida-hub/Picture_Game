"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const featureCards = [
  ["No app required", "Everyone joins from their phone with a room code."],
  ["AI draws the joke", "Answers become anonymous images for the whole table to judge."],
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
  const [backgroundImages, setBackgroundImages] = useState<string[]>([]);
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  useEffect(() => {
    async function loadBackgroundImages() {
      const { data, error } = await supabase
        .from("round_history")
        .select("gallery_thumbnail_url, winner_image_url")
        .not("winner_image_url", "is", null)
        .order("id", { ascending: false })
        .limit(8);

      if (error) {
        console.error("Failed to load homepage images:", error);
        return;
      }

      setBackgroundImages(
        (data || [])
          .map((round) => round.gallery_thumbnail_url || round.winner_image_url)
          .filter((imageUrl): imageUrl is string => Boolean(imageUrl && !imageUrl.startsWith("data:")))
      );
    }

    loadBackgroundImages();
  }, []);

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

  if (showHowToPlay) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-[#fff7ed] px-5 py-8 text-black md:px-8 md:py-12">
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-[#fff7ed]" />
          <div className="absolute -left-20 top-24 h-72 w-72 rounded-full bg-rose-100/80 blur-2xl" />
          <div className="absolute -right-24 bottom-10 h-72 w-72 rounded-full bg-orange-100/80 blur-2xl" />
        </div>

        <section className="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl flex-col justify-center">
          <button
            type="button"
            onClick={() => setShowHowToPlay(false)}
            className="mb-8 w-fit rounded-2xl border-2 border-black bg-white px-5 py-3 text-sm font-black text-rose-700 shadow-[4px_4px_0_#111827] transition active:scale-[0.99] md:hover:-translate-y-0.5"
          >
            Back to home
          </button>

          <div className="rounded-[2rem] border-4 border-black bg-white/95 p-6 shadow-[10px_10px_0_#111827] md:p-8">
            <p className="text-sm font-extrabold uppercase tracking-[0.25em] text-rose-700">
              How to play
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">
              Three steps. Maximum nonsense.
            </h1>
            <p className="mt-4 max-w-2xl text-lg font-bold leading-relaxed text-zinc-700">
              Everyone joins from their phone, writes the funniest answer they can,
              and then votes on the anonymous AI images.
            </p>

            <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
              {howItWorks.map(([number, title, description]) => (
                <div
                  key={number}
                  className="rounded-3xl border-2 border-black bg-rose-50 p-5 shadow-[5px_5px_0_#111827]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-black bg-rose-600 text-lg font-black text-white">
                    {number}
                  </div>
                  <h2 className="mt-5 text-2xl font-black">{title}</h2>
                  <p className="mt-2 text-sm font-bold leading-relaxed text-zinc-600">{description}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-3xl border-2 border-black bg-[#fff7ed] p-5 shadow-[5px_5px_0_#111827]">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-rose-700">
                Winning
              </p>
              <p className="mt-2 text-xl font-black">
                Win rounds by getting votes. First player to 3 points takes the game.
              </p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fff7ed] text-black">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[#fff7ed]" />

        {backgroundImages.length > 0 ? (
          <div className="absolute inset-0 opacity-16 saturate-75">
            {backgroundImages.slice(0, 8).map((imageUrl, index) => {
              const positions = [
                "left-[2%] top-[9%] rotate-[-9deg]",
                "right-[3%] top-[7%] rotate-[8deg]",
                "left-[4%] bottom-[12%] rotate-[7deg]",
                "right-[6%] bottom-[9%] rotate-[-8deg]",
                "left-[42%] top-[3%] rotate-[4deg]",
                "left-[47%] bottom-[4%] rotate-[-4deg]",
                "left-[1%] top-[45%] rotate-[10deg]",
                "right-[1%] top-[46%] rotate-[-10deg]",
              ];

              return (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={`${imageUrl}-${index}`}
                  src={imageUrl}
                  alt=""
                  aria-hidden="true"
                  className={`absolute h-28 w-28 rounded-3xl border-2 border-black object-cover shadow-[6px_6px_0_#111827] md:h-44 md:w-44 ${positions[index]}`}
                />
              );
            })}
          </div>
        ) : (
          <>
            <div className="absolute -left-20 top-24 h-72 w-72 rounded-full bg-rose-100/80 blur-2xl" />
            <div className="absolute -right-24 top-10 h-72 w-72 rounded-full bg-orange-100/80 blur-2xl" />
          </>
        )}

        <div className="absolute inset-0 bg-[#fff7ed]/88 backdrop-blur-[1px]" />
      </div>

      <section className="relative px-5 py-10 md:px-8 md:py-16">
        <div className="relative mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="text-center lg:text-left">
            <p className="mb-4 inline-flex rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-extrabold uppercase tracking-[0.25em] text-rose-700 shadow-[4px_4px_0_#111827]">
              AI party game · 2-8 players · phone friendly
            </p>

            <h1 className="text-5xl font-black tracking-tight md:text-7xl">
              Turn inside jokes into
              <span className="mt-2 block -rotate-1 text-rose-600">ridiculous AI pictures.</span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg font-black leading-relaxed text-zinc-700 lg:mx-0">
              Picture This is a room-code party game where friends answer chaotic prompts,
              AI draws the anonymous masterpieces, and everyone votes for the biggest laugh.
            </p>

            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
              <button
                type="button"
                onClick={createGame}
                className="rounded-2xl bg-zinc-950 px-8 py-4 text-lg font-extrabold text-white shadow-[6px_6px_0_#fb7185] transition active:scale-[0.99] md:hover:-translate-y-0.5"
              >
                Start Free Game
              </button>
              <button
                type="button"
                onClick={() => setShowHowToPlay(true)}
                className="rounded-2xl border-2 border-black bg-white px-8 py-4 text-lg font-extrabold text-rose-700 shadow-[6px_6px_0_#111827] transition active:scale-[0.99] md:hover:-translate-y-0.5"
              >
                How to Play
              </button>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {featureCards.map(([title, description]) => (
                <div key={title} className="rounded-2xl border-2 border-black bg-white/95 p-4 shadow-[4px_4px_0_#111827]">
                  <p className="font-black">{title}</p>
                  <p className="mt-1 text-sm font-bold text-zinc-600">{description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border-4 border-black bg-white/95 p-5 shadow-[10px_10px_0_#111827] md:p-6">
            <div className="rounded-[1.5rem] border-2 border-black bg-[#fff7ed] p-5 text-zinc-950 shadow-[6px_6px_0_#111827]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.25em] text-rose-700">
                    Picture This
                  </p>
                  <h2 className="mt-1 text-3xl font-black">A tiny chaos machine.</h2>
                </div>
                <div className="rounded-2xl border-2 border-black bg-white px-3 py-2 text-2xl shadow-[4px_4px_0_#111827]">
                  <span aria-hidden="true">🎨</span>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border-2 border-black bg-white p-4 text-black shadow-[4px_4px_0_#111827]">
                <p className="text-xs font-extrabold uppercase tracking-wider text-rose-700">
                  Prompt
                </p>
                <p className="mt-1 text-2xl font-black">The worst thing to bring to a family reunion</p>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border-2 border-black bg-white p-3 shadow-[3px_3px_0_#111827]">
                  <p className="text-xs font-extrabold uppercase text-rose-700">Answer</p>
                  <p className="mt-1 font-black">A lie detector test</p>
                </div>
                <div className="rounded-2xl border-2 border-black bg-white p-3 shadow-[3px_3px_0_#111827]">
                  <p className="text-xs font-extrabold uppercase text-rose-700">AI picture</p>
                  <p className="mt-1 font-black">Family truth hour</p>
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl border-2 border-black bg-white shadow-[4px_4px_0_#111827]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/demo-images/lie-detector-test.png"
                  alt="Puppet-style lie detector test scene"
                  className="aspect-[4/3] w-full object-cover"
                />
              </div>
            </div>

            <div id="join" className="mt-6 rounded-3xl border-2 border-black bg-rose-50 p-5 shadow-[5px_5px_0_#111827]">
              <p className="text-sm font-extrabold uppercase tracking-wider text-rose-700">
                Join friends
              </p>
              <h2 className="mt-1 text-2xl font-black">Enter a room code</h2>
              <label className="mt-4 block text-sm font-bold text-rose-700" htmlFor="room-code">
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
                className="mt-2 w-full rounded-2xl border-2 border-black bg-white p-4 text-center text-2xl font-black tracking-[0.3em] uppercase shadow-[3px_3px_0_#111827] focus:border-rose-600 focus:outline-none"
              />
              <button
                type="button"
                onClick={joinGame}
                disabled={roomCode.length !== 5 || isJoining}
                className="mt-4 w-full rounded-2xl bg-rose-600 px-6 py-4 text-lg font-extrabold text-white shadow-[5px_5px_0_#111827] transition hover:bg-rose-700 disabled:opacity-50"
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

      <section className="relative px-5 pb-16 pt-8 md:px-8 md:pb-20 md:pt-12">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-8 lg:grid-cols-[0.8fr_1fr]">
          <div className="rounded-[2rem] border-4 border-black bg-white/95 p-6 shadow-[8px_8px_0_#111827]">
            <p className="text-sm font-extrabold uppercase tracking-[0.25em] text-rose-700">
              New here?
            </p>
            <h2 className="mt-2 text-3xl font-black">Learn the game in 30 seconds.</h2>
            <p className="mt-3 font-bold text-zinc-700">
              See how rooms, prompts, images, voting, and scoring work before you start.
            </p>
            <button
              type="button"
              onClick={() => setShowHowToPlay(true)}
              className="mt-5 rounded-2xl bg-zinc-950 px-6 py-4 font-black text-white shadow-[5px_5px_0_#fb7185] transition active:scale-[0.99] md:hover:-translate-y-0.5"
            >
              Open How to Play
            </button>
          </div>

          <div className="rounded-[2rem] border-4 border-black bg-rose-100 p-6 shadow-[8px_8px_0_#111827]">
            <p className="text-sm font-extrabold uppercase tracking-[0.25em] text-rose-700">
              Coming next
            </p>
            <h2 className="mt-2 text-3xl font-black">Party passes</h2>
            <p className="mt-3 font-bold text-zinc-700">
              Free games stay available while paid party passes will unlock longer sessions,
              more rounds, and bigger group nights.
            </p>
            <div className="mt-5 rounded-2xl border-2 border-black bg-white p-4 shadow-[4px_4px_0_#111827]">
              <p className="font-black">Early plan</p>
              <p className="mt-1 text-sm font-bold text-zinc-600">
                Free trial · Party Pass · Party Night
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
