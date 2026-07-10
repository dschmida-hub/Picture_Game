"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const featureCards = [
  ["Easy room codes", "Everyone joins the same game with a simple shared code."],
  ["AI draws the joke", "Answers become anonymous images for the whole table to judge."],
  ["Built for chaos", "Classic prompts, fill-in-the-blank cards, avatars, voting, and winners."],
];

function formatCount(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1).replace(/\.0$/, "")}k`;
  return String(value);
}

const faqs = [
  {
    question: "How many people can play?",
    answer: "Each room supports 2-8 players. Everyone joins from their own phone with a 5-letter room code.",
  },
  {
    question: "Where can people play?",
    answer: "Right now, everyone can join from a browser with a room code. A dedicated app is something I want to support later.",
  },
  {
    question: "Is it free?",
    answer: "Yes. Free games stay available. Paid Game Night Passes are coming for extra sessions and bigger nights.",
  },
  {
    question: "Is the humor kid-friendly?",
    answer: "You choose the rating per room: Everyone keeps it clean, PG-13 allows roasts and bathroom humor. Players must be 13+ or playing with a parent/guardian.",
  },
  {
    question: "How long does a room stay open?",
    answer: "Rooms expire 24 hours after the first round starts, so you can always pick up a game night later that day.",
  },
  {
    question: "What actually draws the pictures?",
    answer: "An AI image model turns each player's written answer into a picture in seconds, right inside the room.",
  },
];

const howItWorksSteps = [
  {
    number: "1",
    title: "Create or join a room",
    description: "One player starts a room, shares the code, and everyone joins from their own phone.",
  },
  {
    number: "2",
    title: "Answer the prompt",
    description: "Write a short answer that gives the AI something weird, specific, and funny to draw.",
  },
  {
    number: "3",
    title: "Watch the chaos cook",
    description: "The game turns everyone's answers into anonymous images while the room waits together.",
  },
  {
    number: "4",
    title: "Vote for the funniest image",
    description: "Players vote on the images without knowing who wrote what. The winner gets the points.",
  },
];

type ShowcaseItem = {
  answer: string;
  imageUrl: string;
  question: string;
};

function DemoShowcaseCard({
  demoIndex,
  item,
}: {
  demoIndex: number;
  item?: ShowcaseItem;
}) {
  const isLiveWinner = Boolean(item);

  return (
    <div className="rounded-[1.5rem] border-2 border-black bg-[#fff7ed] p-5 text-zinc-950 shadow-[6px_6px_0_#111827]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.25em] text-rose-700">
            Picture This
          </p>
          <h2 className="mt-1 text-3xl font-black">A tiny chaos machine.</h2>
        </div>
        <div className="rounded-2xl border-2 border-black bg-white px-3 py-2 text-xl font-black shadow-[4px_4px_0_#111827]">
          AI
        </div>
      </div>

      <div className="mt-5 rounded-2xl border-2 border-black bg-white p-4 text-black shadow-[4px_4px_0_#111827]">
          <p className="text-xs font-extrabold uppercase tracking-wider text-rose-700">
          Prompt
        </p>
        <p className="mt-1 text-2xl font-black">
          {isLiveWinner ? item?.question : "The worst thing to bring to a family reunion"}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border-2 border-black bg-white p-3 shadow-[3px_3px_0_#111827]">
          <p className="text-xs font-extrabold uppercase text-rose-700">
            Answer
          </p>
          <p className="mt-1 font-black">
            {isLiveWinner ? item?.answer : "A lie detector test"}
          </p>
        </div>
        <div className="rounded-2xl border-2 border-black bg-white p-3 shadow-[3px_3px_0_#111827]">
          <p className="text-xs font-extrabold uppercase text-rose-700">AI picture</p>
          <p className="mt-1 font-black">
            {isLiveWinner ? "Actual game winner" : "Family truth hour"}
          </p>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border-2 border-black bg-white shadow-[4px_4px_0_#111827]">
        {item ? (
          <>
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={demoIndex}
                src={item.imageUrl}
                alt={item.answer || "Recent winning image"}
                className="animate-demo-fade aspect-[4/3] w-full object-cover"
              />
              <span className="absolute left-3 top-3 rounded-full border-2 border-black bg-white px-3 py-1 text-[10px] font-black uppercase tracking-wider text-rose-700">
                Recent winner
              </span>
            </div>
            {item.answer && (
              <p className="border-t-2 border-black px-4 py-3 text-sm font-bold text-zinc-700">
                Winning answer: {`"${item.answer}"`}
              </p>
            )}
          </>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/demo-images/lie-detector-test.png"
            alt="Puppet-style lie detector test scene"
            className="aspect-[4/3] w-full object-cover"
          />
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const [roomCode, setRoomCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [backgroundImages, setBackgroundImages] = useState<string[]>([]);
  const [showcaseItems, setShowcaseItems] = useState<ShowcaseItem[]>([]);
  const [stats, setStats] = useState<{ games: number; images: number; players: number } | null>(null);
  const [demoIndex, setDemoIndex] = useState(0);

  useEffect(() => {
    async function loadBackgroundImages() {
      let { data, error } = await supabase
        .from("round_history")
        .select("game_id, gallery_thumbnail_url, winner_image_url, winner_prompt")
        .not("winner_image_url", "is", null)
        .is("hidden_at", null)
        .order("id", { ascending: false })
        .limit(8);

      // Fall back to the pre-migration query if hidden_at doesn't exist yet
      // (supabase/round_history_moderation.sql not applied), so the homepage
      // still shows recent winners instead of nothing.
      if (error?.code === "42703") {
        ({ data, error } = await supabase
          .from("round_history")
          .select("game_id, gallery_thumbnail_url, winner_image_url, winner_prompt")
          .not("winner_image_url", "is", null)
          .order("id", { ascending: false })
          .limit(8));
      }

      if (error) {
        console.error("Failed to load homepage images:", error);
        return;
      }

      const rounds = data || [];
      const gameIds = Array.from(
        new Set(
          rounds
            .map((round) => Number(round.game_id))
            .filter((gameId) => Number.isInteger(gameId) && gameId > 0)
        )
      );
      const questionByGameId = new Map<number, string>();

      if (gameIds.length > 0) {
        const { data: games, error: gamesError } = await supabase
          .from("games")
          .select("id, prompt")
          .in("id", gameIds);

        if (gamesError) {
          console.error("Failed to load homepage showcase prompts:", gamesError);
        } else {
          (games || []).forEach((game) => {
            questionByGameId.set(Number(game.id), game.prompt || "");
          });
        }
      }

      setBackgroundImages(
        rounds
          .map((round) => round.gallery_thumbnail_url || round.winner_image_url)
          .filter((imageUrl): imageUrl is string =>
            Boolean(imageUrl && !imageUrl.startsWith("data:"))
          )
      );

      setShowcaseItems(
        rounds
          .map((round) => ({
            answer: round.winner_prompt,
            imageUrl: round.gallery_thumbnail_url || round.winner_image_url,
            question: questionByGameId.get(Number(round.game_id)) || "A recent winning prompt",
          }))
          .filter(
            (item): item is ShowcaseItem =>
              Boolean(item.imageUrl && !item.imageUrl.startsWith("data:") && item.answer)
          )
          .slice(0, 6)
      );
    }

    async function loadStats() {
      const [games, images, players] = await Promise.all([
        supabase.from("round_history").select("id", { count: "exact", head: true }),
        supabase
          .from("submissions")
          .select("id", { count: "exact", head: true })
          .not("image_url", "is", null),
        supabase.from("players").select("id", { count: "exact", head: true }),
      ]);

      if (games.error || images.error || players.error) {
        console.error("Failed to load homepage stats:", games.error || images.error || players.error);
        return;
      }

      setStats({
        games: games.count || 0,
        images: images.count || 0,
        players: players.count || 0,
      });
    }

    loadBackgroundImages();
    loadStats();
  }, []);

  useEffect(() => {
    if (showcaseItems.length < 2) return;

    const interval = window.setInterval(() => {
      setDemoIndex((current) => (current + 1) % showcaseItems.length);
    }, 3500);

    return () => window.clearInterval(interval);
  }, [showcaseItems.length]);

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

  const activeShowcaseItem = showcaseItems[demoIndex];

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
              <span className="mt-2 block -rotate-1 text-rose-600">
                ridiculous AI pictures.
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg font-black leading-relaxed text-zinc-700 lg:mx-0">
              Finally, a card game that&apos;s as funny as you are.
            </p>

            <div className="mx-auto mt-7 max-w-xl lg:hidden">
              <DemoShowcaseCard demoIndex={demoIndex} item={activeShowcaseItem} />
            </div>

            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
              <button
                type="button"
                onClick={createGame}
                className="rounded-2xl bg-rose-600 px-10 py-5 text-xl font-black text-white shadow-[6px_6px_0_#111827] transition active:scale-[0.99] md:hover:-translate-y-0.5"
              >
                Start Free Game
              </button>
              <Link
                href="/how-to-play"
                className="rounded-2xl border-2 border-black bg-white px-8 py-4 text-lg font-extrabold text-rose-700 shadow-[6px_6px_0_#111827] transition active:scale-[0.99] md:hover:-translate-y-0.5"
              >
                How to Play
              </Link>
            </div>

            {stats && stats.images >= 20 && (
              <div className="mt-8 flex flex-wrap justify-center gap-6 lg:justify-start">
                {[
                  ["Images conjured", formatCount(stats.images)],
                  ["Rounds played", formatCount(stats.games)],
                  ["Players in on it", formatCount(stats.players)],
                ].map(([label, value]) => (
                  <div key={label} className="text-center lg:text-left">
                    <p className="text-3xl font-black text-rose-600">{value}</p>
                    <p className="text-xs font-black uppercase tracking-wider text-zinc-500">{label}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {featureCards.map(([title, description]) => (
                <div
                  key={title}
                  className="rounded-2xl border-2 border-black bg-white/95 p-4 shadow-[4px_4px_0_#111827]"
                >
                  <p className="font-black">{title}</p>
                  <p className="mt-1 text-sm font-bold text-zinc-600">{description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border-4 border-black bg-white/95 p-5 shadow-[10px_10px_0_#111827] md:p-6">
            <div className="hidden lg:block">
              <DemoShowcaseCard demoIndex={demoIndex} item={activeShowcaseItem} />
            </div>

            <div
              id="join"
              className="rounded-3xl border-2 border-black bg-rose-50 p-5 shadow-[5px_5px_0_#111827] lg:mt-6"
            >
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

      <section className="relative px-5 pb-4 pt-2 md:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <p className="text-center text-sm font-extrabold uppercase tracking-[0.25em] text-rose-700">
            How it works
          </p>
          <h2 className="mt-2 text-center text-3xl font-black md:text-4xl">
            Understand it in about 10 seconds.
          </h2>

          <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
            {howItWorksSteps.map((step) => (
              <div
                key={step.number}
                className="rounded-3xl border-2 border-black bg-white p-5 shadow-[5px_5px_0_#111827]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-black bg-rose-600 text-lg font-black text-white">
                  {step.number}
                </div>
                <h3 className="mt-4 text-xl font-black">{step.title}</h3>
                <p className="mt-2 text-sm font-bold leading-relaxed text-zinc-600">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative px-5 pb-16 pt-8 md:px-8 md:pb-20 md:pt-12">
        <div className="mx-auto w-full max-w-3xl rounded-[2rem] border-4 border-black bg-rose-100 p-6 shadow-[8px_8px_0_#111827] md:p-8">
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
      </section>

      <section className="relative px-5 pb-16 md:px-8">
        <div className="mx-auto w-full max-w-4xl">
          <p className="text-center text-sm font-extrabold uppercase tracking-[0.25em] text-rose-700">
            FAQ
          </p>
          <h2 className="mt-2 text-center text-3xl font-black md:text-4xl">
            Quick questions, quick answers.
          </h2>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {faqs.map((faq) => (
              <details
                key={faq.question}
                className="group rounded-3xl border-2 border-black bg-white p-5 shadow-[5px_5px_0_#111827]"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-black marker:content-none [&::-webkit-details-marker]:hidden">
                  {faq.question}
                  <span
                    aria-hidden="true"
                    className="shrink-0 text-xl leading-none text-rose-700 transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-2 text-sm font-bold leading-relaxed text-zinc-600">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <footer className="relative mx-auto mt-8 flex w-full max-w-6xl flex-wrap items-center justify-center gap-4 pb-4 text-sm font-bold text-zinc-600">
        <Link href="/terms" className="underline-offset-4 hover:underline">
          Terms of Service
        </Link>
        <span aria-hidden="true">·</span>
        <Link href="/privacy" className="underline-offset-4 hover:underline">
          Privacy Policy
        </Link>
      </footer>
    </main>
  );
}
