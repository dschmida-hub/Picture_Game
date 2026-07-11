"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { ensureAnonymousSession, supabase } from "@/lib/supabase";
import { parseSubmission } from "../components/submissions";
import { usePartyModeReveal } from "../hooks/usePartyModeReveal";
import { useRoundCountdowns } from "../hooks/useRoundCountdowns";
import type { ContentRating, Player, ScoreboardPlayer } from "../components/types";
import {
  formatCountdown,
  GENERATING_LOADING_MESSAGES,
  getContentRatingLabel,
  getImageStyleLabel,
  PARTY_MODE_SECONDS_PER_IMAGE,
} from "../utils/gameRoomUtils";

type FloatingReaction = {
  id: number;
  emoji: string;
  leftPercent: number;
};

type TvStage = "lobby" | "submitting" | "generating" | "reveal" | "winner";

type RoundWinnerRow = {
  winner_name: string | null;
  winner_prompt: string | null;
  winner_image_url: string | null;
  gallery_thumbnail_url: string | null;
};

const MAX_PLAYERS = 8;

export default function TvMode() {
  const params = useParams();
  const code = (params.code as string) || "";

  const [players, setPlayers] = useState<Player[]>([]);
  const [scoreboardPlayers, setScoreboardPlayers] = useState<ScoreboardPlayer[]>([]);
  const [stage, setStage] = useState<TvStage>("lobby");
  const [currentGameId, setCurrentGameId] = useState<number | null>(null);
  const [roundPrompt, setRoundPrompt] = useState("");
  const [roundImageStyle, setRoundImageStyle] = useState("clay_animation");
  const [contentRating, setContentRating] = useState<ContentRating>("everyone");
  const [roundDeadline, setRoundDeadline] = useState<string | null>(null);
  const [votingDeadline, setVotingDeadline] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<string[]>([]);
  const [voteCount, setVoteCount] = useState(0);
  const [roundWinners, setRoundWinners] = useState<RoundWinnerRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [partyMode, setPartyMode] = useState(false);
  const [revealStartedAt, setRevealStartedAt] = useState<string | null>(null);
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
  const [isWinnerImageRevealed, setIsWinnerImageRevealed] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  const currentGameIdRef = useRef<number | null>(null);
  useEffect(() => {
    currentGameIdRef.current = currentGameId;
  }, [currentGameId]);

  // Party Mode gets a beat of suspense - winner name first, then the image
  // pops in - instead of dumping everything on screen at once. Regular
  // rounds skip the delay and show it all immediately, same as before.
  useEffect(() => {
    if (stage !== "winner" || roundWinners.length === 0) {
      setIsWinnerImageRevealed(false);
      return;
    }

    if (!partyMode) {
      setIsWinnerImageRevealed(true);
      return;
    }

    const timeout = window.setTimeout(() => setIsWinnerImageRevealed(true), 2200);
    return () => window.clearTimeout(timeout);
  }, [stage, roundWinners, partyMode]);

  const { timeRemainingSeconds, votingTimeRemainingSeconds } = useRoundCountdowns({
    roundDeadline,
    stage,
    votingDeadline,
  });

  const { isSequenceActive: isPartyModeRevealActive, currentImageIndex: partyModeImageIndex, secondsRemainingForImage: partyModeSecondsRemaining } =
    usePartyModeReveal({
      isPartyMode: partyMode && stage === "reveal",
      revealStartedAt,
      submissionCount: submissions.length,
    });

  const finalWinner = scoreboardPlayers.find((player) => (player.points ?? 0) >= 3) || null;

  async function loadPlayers() {
    const { data, error } = await supabase
      .from("players")
      .select("id, name, points, avatar_url, avatar_description, is_host")
      .eq("room_code", code)
      .order("is_host", { ascending: false })
      .order("points", { ascending: false });

    if (error) {
      console.error("TV mode: failed to load players:", error);
      return;
    }

    setPlayers(data || []);
    setScoreboardPlayers(
      [...(data || [])]
        .map((player) => ({ name: player.name, points: player.points, avatar_url: player.avatar_url }))
        .sort((first, second) => (second.points ?? 0) - (first.points ?? 0))
    );
  }

  async function loadSubmissions(gameId: number | null) {
    if (!gameId) {
      setSubmissions([]);
      return;
    }

    const { data, error } = await supabase
      .from("submissions")
      .select("id, player_name, prompt, image_url, gallery_thumbnail_url, image_caption")
      .eq("room_code", code)
      .eq("game_id", gameId)
      .is("hidden_at", null)
      .order("id", { ascending: true });

    if (error) {
      console.error("TV mode: failed to load submissions:", error);
      return;
    }

    setSubmissions(
      (data || []).map(
        (item) =>
          `${item.id}|||${item.prompt}|||${item.image_url || ""}|||${item.player_name}|||${
            item.image_caption || "Untitled Masterpiece"
          }|||${item.gallery_thumbnail_url || ""}`
      )
    );
  }

  async function loadVoteCount(gameId: number | null) {
    if (!gameId) {
      setVoteCount(0);
      return;
    }

    const { count, error } = await supabase
      .from("votes")
      .select("id", { count: "exact", head: true })
      .eq("game_id", gameId);

    if (error) {
      console.error("TV mode: failed to load vote count:", error);
      return;
    }

    setVoteCount(count || 0);
  }

  // The winner and its point award are computed once, idempotently, by a
  // player's own client (guarded by games.winner_awarded) - TV mode never
  // duplicates that logic, it just reads the round_history row(s) that
  // computation writes. Stage flips to "winner" slightly before that write
  // lands, so this retries once after a short delay instead of racing it.
  async function loadRoundWinner(gameId: number | null, attempt = 0) {
    if (!gameId) {
      setRoundWinners([]);
      return;
    }

    const { data, error } = await supabase
      .from("round_history")
      .select("winner_name, winner_prompt, winner_image_url, gallery_thumbnail_url")
      .eq("room_code", code)
      .eq("game_id", gameId);

    if (error) {
      console.error("TV mode: failed to load round winner:", error);
      return;
    }

    if ((data || []).length === 0 && attempt === 0) {
      window.setTimeout(() => loadRoundWinner(gameId, 1), 1500);
      return;
    }

    setRoundWinners(data || []);
  }

  async function loadGame() {
    const { data, error } = await supabase
      .from("games")
      .select(
        "id, stage, prompt, image_style, content_rating, submission_deadline, voting_deadline, party_mode, reveal_started_at"
      )
      .eq("room_code", code)
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("TV mode: failed to load game:", error);
      return;
    }

    if (!data) return;

    setCurrentGameId(data.id);
    setStage((data.stage as TvStage) || "lobby");
    setRoundPrompt(data.prompt || "");
    setRoundImageStyle(data.image_style || "clay_animation");
    setContentRating(data.content_rating === "pg13" ? "pg13" : "everyone");
    setRoundDeadline(data.submission_deadline);
    setVotingDeadline(data.voting_deadline);
    setPartyMode(Boolean(data.party_mode));
    setRevealStartedAt(data.reveal_started_at);

    await loadSubmissions(data.id);
    await loadVoteCount(data.id);

    if (data.stage === "winner") {
      await loadRoundWinner(data.id);
    }
  }

  useEffect(() => {
    let isMounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let fallbackInterval: ReturnType<typeof setInterval> | null = null;

    async function loadInitialData() {
      setIsLoading(true);
      await Promise.allSettled([loadPlayers(), loadGame()]);
      if (isMounted) setIsLoading(false);
    }

    function refreshEverything() {
      loadPlayers();
      loadGame();
    }

    async function setupRoomConnection() {
      // RLS scopes reads to actual room participants. TV Mode isn't a
      // player, so it registers itself as a viewer of this room - without
      // this, every read (including the subscription below) comes back
      // empty.
      await ensureAnonymousSession();
      if (!isMounted) return;

      const { error: viewerError } = await supabase.rpc("register_room_viewer", {
        room_code_input: code,
      });
      if (viewerError) {
        console.error("TV mode: failed to register as a room viewer:", viewerError);
      }
      if (!isMounted) return;

      loadInitialData();

      // Same channel name as the phone room page (not "tv:...") so the
      // broadcast reactions players send on their phones actually arrive here.
      const newChannel = supabase
        .channel(`room:${code}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "games", filter: `room_code=eq.${code}` },
          () => loadGame()
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "players", filter: `room_code=eq.${code}` },
          () => loadPlayers()
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "submissions", filter: `room_code=eq.${code}` },
          () => loadSubmissions(currentGameIdRef.current)
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "votes", filter: `room_code=eq.${code}` },
          () => loadVoteCount(currentGameIdRef.current)
        )
        .on("broadcast", { event: "reaction" }, ({ payload }) => {
          const emoji = (payload as { emoji?: string })?.emoji;
          if (!emoji) return;

          const id = Date.now() + Math.random();
          setFloatingReactions((current) => [
            ...current,
            { id, emoji, leftPercent: 10 + Math.random() * 80 },
          ]);
          window.setTimeout(() => {
            setFloatingReactions((current) => current.filter((reaction) => reaction.id !== id));
          }, 2500);
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            refreshEverything();
            // Lets the lobby know a shared screen is actually watching, so it
            // can require one before Party Mode is allowed to start.
            newChannel.track({ role: "tv" });
          }
        });

      if (!isMounted) {
        supabase.removeChannel(newChannel);
        return;
      }

      channel = newChannel;
      fallbackInterval = setInterval(refreshEverything, 20000);
    }

    setupRoomConnection();

    return () => {
      isMounted = false;
      if (channel) supabase.removeChannel(channel);
      if (fallbackInterval) clearInterval(fallbackInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const joinUrl = code ? `https://playpicturethis.com/game/${code}` : "";
  const readyImageCount = submissions.filter((item) => Boolean(parseSubmission(item).imageUrl)).length;
  const allAnswersSubmitted = players.length > 0 && submissions.length >= players.length;
  // The DB stage stays "submitting" through image generation - there's no
  // separate DB stage for it. This derives the same "everyone answered,
  // images still cooking" state the phone side already shows.
  const isGeneratingImages = stage === "submitting" && allAnswersSubmitted && readyImageCount < players.length;
  const showGeneratingView = stage === "generating" || isGeneratingImages;
  const currentLoadingMessage =
    GENERATING_LOADING_MESSAGES[loadingMessageIndex % GENERATING_LOADING_MESSAGES.length];

  useEffect(() => {
    if (!showGeneratingView) return;
    const interval = window.setInterval(() => {
      setLoadingMessageIndex((current) => current + 1);
    }, 2600);
    return () => window.clearInterval(interval);
  }, [showGeneratingView]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#fff7ed] text-zinc-950">
        <p className="text-2xl font-black">Loading room...</p>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-8 bg-[#fff7ed] p-10 text-center text-zinc-950">
      <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden" aria-hidden="true">
        {floatingReactions.map((reaction) => (
          <span
            key={reaction.id}
            className="absolute bottom-10 text-7xl"
            style={{
              left: `${reaction.leftPercent}%`,
              animation: "float-up 2.5s ease-out forwards",
            }}
          >
            {reaction.emoji}
          </span>
        ))}
      </div>

      {stage === "lobby" && (
        <>
          <p className="text-xl font-black uppercase tracking-[0.3em] text-rose-700">
            Join on your phone
          </p>
          <p className="text-9xl font-black tracking-widest text-rose-600">{code}</p>

          {joinUrl && (
            <div className="rounded-[2rem] border-4 border-black bg-white p-6 shadow-[10px_10px_0_#111827]">
              <QRCodeSVG value={joinUrl} size={220} />
            </div>
          )}

          <p className="text-lg font-bold text-zinc-600">playpicturethis.com &middot; enter code {code}</p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
            {players.map((player) => (
              <div key={player.id} className="flex flex-col items-center gap-2">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-black bg-rose-100 text-2xl font-black text-rose-800">
                  {player.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={player.avatar_url} alt={player.name} className="h-full w-full object-cover" />
                  ) : (
                    "?"
                  )}
                </div>
                <p className="max-w-[7rem] truncate text-lg font-black">{player.name}</p>
              </div>
            ))}
          </div>

          <p className="text-xl font-black text-rose-700">
            {players.length} / {MAX_PLAYERS} players in the room
          </p>
        </>
      )}

      {stage === "submitting" && !isGeneratingImages && (
        <>
          <p className="text-lg font-black uppercase tracking-[0.3em] text-rose-700">Round Prompt</p>
          <h1 className="max-w-5xl text-6xl font-black leading-tight">{roundPrompt}</h1>
          <p className="text-lg font-bold text-zinc-600">
            Art style: {getImageStyleLabel(roundImageStyle)} &middot; Humor: {getContentRatingLabel(contentRating)}
          </p>

          {timeRemainingSeconds !== null && (
            <p className="text-4xl font-black text-rose-600">
              {timeRemainingSeconds === 0 ? "Time's up!" : formatCountdown(timeRemainingSeconds)}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
            {players.map((player) => (
              <div key={player.id} className="flex flex-col items-center gap-2">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-4 border-black bg-rose-100 text-xl font-black text-rose-800">
                  {player.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={player.avatar_url} alt={player.name} className="h-full w-full object-cover" />
                  ) : (
                    "?"
                  )}
                </div>
                <p className="max-w-[6rem] truncate text-base font-bold">{player.name}</p>
              </div>
            ))}
          </div>

          <p className="text-lg font-bold text-zinc-500">Answering on phones...</p>
        </>
      )}

      {showGeneratingView && (
        <>
          <div className="h-16 w-16 animate-spin rounded-full border-8 border-rose-200 border-t-rose-600" />
          <h1 className="text-5xl font-black">Creating Chaos...</h1>
          <p className="max-w-2xl text-xl font-bold text-zinc-600">{currentLoadingMessage}</p>

          <div className="h-3 w-full max-w-xl overflow-hidden rounded-full bg-zinc-200">
            <div
              className="h-full rounded-full bg-rose-600 transition-all duration-500"
              style={{
                width: `${players.length ? Math.round((readyImageCount / players.length) * 100) : 0}%`,
              }}
            />
          </div>

          <p className="text-2xl font-black text-rose-700">
            {readyImageCount} / {players.length} images ready
          </p>

          <div className="mt-2 flex flex-wrap items-center justify-center gap-4">
            {players.map((player) => {
              const playerSubmission = submissions.find(
                (item) => parseSubmission(item).playerName === player.name
              );
              const isReady = Boolean(playerSubmission && parseSubmission(playerSubmission).imageUrl);

              return (
                <div key={player.id} className="flex flex-col items-center gap-2">
                  <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-4 border-black bg-rose-100 text-xl font-black text-rose-800">
                    {player.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={player.avatar_url} alt={player.name} className="h-full w-full object-cover" />
                    ) : (
                      "?"
                    )}
                    <span
                      className={`absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-black text-xs font-black ${
                        isReady ? "bg-emerald-400" : "bg-white"
                      }`}
                    >
                      {isReady ? (
                        "✓"
                      ) : (
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-rose-300 border-t-rose-600" />
                      )}
                    </span>
                  </div>
                  <p className="max-w-[6rem] truncate text-base font-bold">{player.name}</p>
                </div>
              );
            })}
          </div>
        </>
      )}

      {stage === "reveal" && isPartyModeRevealActive && (
        <>
          <p className="text-lg font-black uppercase tracking-[0.3em] text-rose-700">
            Image {partyModeImageIndex + 1} of {submissions.length}
          </p>

          {(() => {
            const current = submissions[partyModeImageIndex];
            if (!current) return null;
            const { imageUrl, thumbnailUrl, imageCaption } = parseSubmission(current);
            const displayImageUrl = thumbnailUrl || imageUrl;

            return (
              <div className="overflow-hidden rounded-[2rem] border-4 border-black bg-white shadow-[10px_10px_0_#111827]">
                {displayImageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={displayImageUrl}
                    alt={imageCaption || "A player submission"}
                    className="aspect-square w-full max-w-xl object-cover"
                  />
                )}
                <p className="p-4 text-2xl font-black">{imageCaption || "Untitled Masterpiece"}</p>
              </div>
            );
          })()}

          <div className="h-2 w-full max-w-xl overflow-hidden rounded-full bg-zinc-200">
            <div
              className="h-full rounded-full bg-rose-600 transition-all"
              style={{ width: `${((PARTY_MODE_SECONDS_PER_IMAGE - partyModeSecondsRemaining) / PARTY_MODE_SECONDS_PER_IMAGE) * 100}%` }}
            />
          </div>

          <p className="text-lg font-bold text-zinc-500">
            Grab your phone and react to what you&apos;re seeing!
          </p>
        </>
      )}

      {stage === "reveal" && !isPartyModeRevealActive && (
        <>
          <p className="text-lg font-black uppercase tracking-[0.3em] text-rose-700">Vote on your phone!</p>
          {votingTimeRemainingSeconds !== null && (
            <p className="text-4xl font-black text-rose-600">
              {votingTimeRemainingSeconds === 0 ? "Time's up!" : formatCountdown(votingTimeRemainingSeconds)}
            </p>
          )}

          <div className="grid w-full max-w-6xl grid-cols-2 gap-5 md:grid-cols-3">
            {submissions.map((item, index) => {
              const { imageUrl, thumbnailUrl, imageCaption } = parseSubmission(item);
              const displayImageUrl = thumbnailUrl || imageUrl;

              return (
                <div
                  key={index}
                  className="overflow-hidden rounded-[1.5rem] border-4 border-black bg-white shadow-[6px_6px_0_#111827]"
                >
                  {displayImageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={displayImageUrl}
                      alt={imageCaption || "A player submission"}
                      className="aspect-square w-full object-cover"
                    />
                  )}
                  <p className="p-3 text-lg font-black">{imageCaption || "Untitled Masterpiece"}</p>
                </div>
              );
            })}
          </div>

          <p className="text-2xl font-black text-rose-700">{voteCount} votes cast</p>
        </>
      )}

      {stage === "winner" && (
        <>
          {finalWinner ? (
            <>
              <p className="text-xl font-black uppercase tracking-[0.3em] text-amber-600">Game Winner</p>
              <h1 className="text-7xl font-black">{finalWinner.name}!</h1>
            </>
          ) : (
            <p className="text-lg font-black uppercase tracking-[0.3em] text-rose-700">Round Winner</p>
          )}

          {roundWinners.length === 0 ? (
            <p className="text-2xl font-black text-zinc-500">Tallying votes...</p>
          ) : partyMode && !isWinnerImageRevealed ? (
            <div className="flex flex-col items-center gap-3">
              <p className="text-lg font-bold text-zinc-500">And the winner is...</p>
              <p
                className="text-5xl font-black text-rose-600"
                style={{ animation: "drumroll-pulse 0.5s ease-in-out infinite" }}
              >
                {roundWinners.map((winner) => winner.winner_name).join(" and ")}
              </p>
            </div>
          ) : (
            <div className={`grid gap-5 ${roundWinners.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
              {roundWinners.map((winner, index) => (
                <div
                  key={index}
                  className="flex flex-col items-center gap-3"
                  style={{ animation: "winner-pop 0.6s ease-out" }}
                >
                  {(winner.gallery_thumbnail_url || winner.winner_image_url) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={winner.gallery_thumbnail_url || winner.winner_image_url || ""}
                      alt={winner.winner_prompt || "Winning image"}
                      className="aspect-square w-72 rounded-[1.5rem] border-4 border-black object-cover shadow-[6px_6px_0_#111827]"
                    />
                  )}
                  <p className="text-3xl font-black">{winner.winner_name}</p>
                  <p className="max-w-sm text-lg font-bold text-zinc-600">{`"${winner.winner_prompt}"`}</p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-col gap-2">
            {scoreboardPlayers.map((player, index) => (
              <div
                key={player.name}
                className={`flex w-80 items-center justify-between rounded-2xl px-5 py-3 text-xl font-black ${
                  index === 0 ? "border-2 border-black bg-amber-100" : "border border-sky-200 bg-sky-100"
                }`}
              >
                <span>{player.name}</span>
                <span>{player.points ?? 0}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
