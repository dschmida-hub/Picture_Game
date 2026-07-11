import { useEffect, useState } from "react";
import { HelpTooltip } from "./HelpTooltip";
import { PromptSuggestionPanel } from "./PromptSuggestionPanel";
import type { ContentRating, GameMode, Player, PromptRating, PromptSuggestion, RoundDuration } from "./types";
import { getGameModeLabel } from "../utils/gameRoomUtils";

type LobbyScreenProps = {
  code: string;
  players: Player[];
  maxPlayers: number;
  playerName: string;
  isHost: boolean;
  hostName?: string;
  selectedGameMode: GameMode;
  hasSelectedGameMode: boolean;
  selectedContentRating: ContentRating;
  selectedCategory: string;
  promptCategories: string[];
  selectedImageStyle: string;
  selectedRoundDuration: RoundDuration;
  selectedVotingDuration: number;
  selectedPartyMode: boolean;
  isTvConnected: boolean;
  isStarting: boolean;
  isRoundCustomizationOpen: boolean;
  roomShareMessage: string;
  roomExpirationMessage: string;
  promptSuggestions: PromptSuggestion[];
  promptSuggestionText: string;
  promptSuggestionRating: PromptRating;
  promptApprovalVotesNeeded: number;
  isSubmittingPromptSuggestion: boolean;
  onGameModeChange: (mode: GameMode) => void;
  onContentRatingChange: (rating: ContentRating) => void;
  onCategoryChange: (category: string) => void;
  onImageStyleChange: (style: string) => void;
  onRoundDurationChange: (duration: RoundDuration) => void;
  onVotingDurationChange: (duration: number) => void;
  onToggleRoundCustomization: () => void;
  onStartGame: () => void;
  onCopyRoomCode: () => void;
  onShareRoom: () => void;
  onPromptSuggestionTextChange: (value: string) => void;
  onSubmitPromptSuggestion: () => void;
  onVotePromptSuggestion: (suggestionId: number) => void;
  onRemovePlayer: (player: Player) => void;
  onClaimHost: () => void;
};

const cardClass = "rounded-[2rem] border-2 border-black bg-white p-4 shadow-[8px_8px_0_#111827] md:p-5";
const selectClass = "w-full rounded-xl border-2 border-black bg-white p-3 font-bold";
const imageStyleDescriptions: Record<string, string> = {
  prompt: "Use the style attached to the prompt, or default to a squishy claymation look.",
  cartoon: "Bright, expressive, and easy to read on phones.",
  comic_book: "Bold outlines, dramatic reactions, and panel-style energy.",
  clay_animation: "Squishy handmade characters with playful stop-motion charm.",
  storybook: "Soft illustrated scenes with cozy children's-book polish.",
  pixel_art: "Retro game-style images with chunky pixels and simple shapes.",
  puppet_show: "A silly handmade stage look with felt, strings, and theatrical chaos.",
  childrens_picture_book: "Wholesome picture-book art that makes dumb jokes feel extra absurd.",
  lego_stop_motion: "Toy-brick characters staged like a stop-motion short.",
  minecraft: "Blocky sandbox scenes with recognizable cube-world style.",
  renaissance_painting: "Dramatic old-master lighting for maximum unnecessary seriousness.",
};

function formatCategoryLabel(category: string) {
  if (category === "Random") return category;

  return category
    .split(/[_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function LobbyScreen({
  code,
  players,
  maxPlayers,
  playerName,
  isHost,
  hostName,
  selectedGameMode,
  hasSelectedGameMode,
  selectedContentRating,
  selectedCategory,
  promptCategories,
  selectedImageStyle,
  selectedRoundDuration,
  selectedVotingDuration,
  selectedPartyMode,
  isTvConnected,
  isStarting,
  isRoundCustomizationOpen,
  roomShareMessage,
  roomExpirationMessage,
  promptSuggestions,
  promptSuggestionText,
  promptSuggestionRating,
  promptApprovalVotesNeeded,
  isSubmittingPromptSuggestion,
  onGameModeChange,
  onContentRatingChange,
  onCategoryChange,
  onImageStyleChange,
  onRoundDurationChange,
  onVotingDurationChange,
  onToggleRoundCustomization,
  onStartGame,
  onCopyRoomCode,
  onShareRoom,
  onPromptSuggestionTextChange,
  onSubmitPromptSuggestion,
  onVotePromptSuggestion,
  onRemovePlayer,
  onClaimHost,
}: LobbyScreenProps) {
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false);
  const openSlots = maxPlayers - players.length;
  const categoryOptions = ["Random", ...promptCategories];

  useEffect(() => {
    if (!isHowToPlayOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isHowToPlayOpen]);

  return (
    <>
      <div className="w-full max-w-6xl text-center">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-rose-700">Room {code}</p>
        <h2 className="mt-1 text-4xl font-black tracking-tight md:text-6xl">Waiting for Players</h2>
        <p className="mt-2 text-sm font-black text-rose-700">
          {players.length} / {maxPlayers} players in the room
        </p>
        <p className="mt-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
          {roomExpirationMessage}
        </p>
        <button
          type="button"
          onClick={() => setIsHowToPlayOpen(true)}
          className="mt-4 rounded-full border-2 border-black bg-white px-5 py-2.5 text-sm font-black text-zinc-950 shadow-[4px_4px_0_#111827]"
        >
          How to play
        </button>
      </div>

      {isHowToPlayOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[2rem] border-2 border-black bg-white p-5 text-black shadow-[8px_8px_0_#111827] md:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-rose-700">
                  Quick rules
                </p>
                <h3 className="mt-2 text-3xl font-black">How to play</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsHowToPlayOpen(false)}
                className="rounded-full border-2 border-black bg-white px-3 py-2 text-sm font-black"
                aria-label="Close how to play"
              >
                X
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {[
                ["1", "Answer the prompt", "Write something short, specific, and funny."],
                ["2", "AI draws the chaos", "Your answer turns into an anonymous image."],
                ["3", "Vote for funniest", "Pick the image that gets the biggest laugh."],
                ["4", "First to 3 wins", "Keep playing rounds until someone takes the crown."],
              ].map(([number, title, description]) => (
                <div key={number} className="flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-600 font-black text-white">
                    {number}
                  </div>
                  <div>
                    <p className="font-black">{title}</p>
                    <p className="text-sm font-bold text-zinc-600">{description}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setIsHowToPlayOpen(false)}
              className="mt-5 w-full rounded-2xl bg-zinc-950 px-5 py-3 font-black text-white"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      <div className="grid w-full max-w-6xl grid-cols-1 items-start gap-4 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:gap-6">
        <div className={`order-2 md:order-1 ${cardClass}`}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black">Players</h3>
              <p className="text-sm font-bold text-zinc-500">
                {openSlots === 0
                  ? "The room is full!"
                  : `Waiting for ${openSlots} more player${openSlots === 1 ? "" : "s"}.`}
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-rose-200 bg-rose-100 px-3 py-1 text-sm font-black text-rose-800">
              {players.length} / {maxPlayers}
            </span>
          </div>

          <div className="mb-4 grid gap-1" style={{ gridTemplateColumns: `repeat(${maxPlayers}, minmax(0, 1fr))` }}>
            {Array.from({ length: maxPlayers }, (_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full ${index < players.length ? "bg-rose-600" : "bg-zinc-200"}`}
              />
            ))}
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-1">
            {players.map((player) => (
              <div key={player.name} className="flex items-center gap-3 rounded-2xl border-2 border-black bg-white p-3">
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-black bg-rose-100 text-sm font-black text-rose-800 md:h-14 md:w-14">
                  <span aria-hidden="true">?</span>
                  {player.avatar_url && (
                    <img
                      src={player.avatar_url}
                      alt={player.name}
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate font-black">
                    {player.name}
                    {player.is_host && <span className="ml-2 text-amber-600">Host</span>}
                  </div>
                  <div className="text-sm font-bold text-zinc-500">{player.points} pts</div>
                </div>
                {isHost && !player.is_host && (
                  <button
                    type="button"
                    onClick={() => onRemovePlayer(player)}
                    className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700"
                    aria-label={`Remove ${player.name}`}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="order-1 flex w-full flex-col gap-4 md:order-2">
          {isHost ? (
            <>
              <div className={cardClass}>
                <div className="mb-3 flex items-center gap-2">
                  <p className="text-sm font-black uppercase tracking-[0.22em] text-rose-700">
                    Choose game mode
                  </p>
                  <HelpTooltip text="Classic means everyone writes a full funny answer. Fill in the Blank gives a prompt-card style setup. Most Likely To uses roast-style 'who's most likely to...' prompts." />
                </div>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => onGameModeChange("classic")}
                    className={`rounded-2xl border-2 p-2.5 text-left transition sm:p-4 ${
                      hasSelectedGameMode && selectedGameMode === "classic"
                        ? "border-black bg-rose-50 shadow-[4px_4px_0_#111827]"
                        : "border-zinc-200 bg-white hover:border-black"
                    }`}
                  >
                    <span className="block text-sm font-black sm:text-lg">Classic</span>
                    <span className="text-xs font-bold text-zinc-500 sm:text-sm">Write a funny answer</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onGameModeChange("cards")}
                    className={`rounded-2xl border-2 p-2.5 text-left transition sm:p-4 ${
                      hasSelectedGameMode && selectedGameMode === "cards"
                        ? "border-black bg-zinc-950 text-white shadow-[4px_4px_0_#fb7185]"
                        : "border-zinc-200 bg-white hover:border-black"
                    }`}
                  >
                    <span className="block text-sm font-black sm:text-lg">Fill in the Blank</span>
                    <span className={`text-xs font-bold sm:text-sm ${hasSelectedGameMode && selectedGameMode === "cards" ? "text-zinc-300" : "text-zinc-500"}`}>
                      Complete a prompt card
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onGameModeChange("most_likely_to")}
                    className={`rounded-2xl border-2 p-2.5 text-left transition sm:p-4 ${
                      hasSelectedGameMode && selectedGameMode === "most_likely_to"
                        ? "border-black bg-amber-50 shadow-[4px_4px_0_#111827]"
                        : "border-zinc-200 bg-white hover:border-black"
                    }`}
                  >
                    <span className="block text-sm font-black sm:text-lg">Most Likely To</span>
                    <span className="text-xs font-bold text-zinc-500 sm:text-sm">Playful roast-style prompts</span>
                  </button>
                </div>
                {!hasSelectedGameMode && (
                  <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-black text-amber-900">
                    Pick a game mode to unlock player-made prompts and start the game.
                  </p>
                )}
              </div>

              {hasSelectedGameMode && selectedGameMode === "classic" && (
                <div className={cardClass}>
                  <label className="mb-2 flex items-center gap-2 text-sm font-black uppercase tracking-[0.22em] text-rose-700">
                    Prompt category
                    <HelpTooltip text="Random pulls from every active classic prompt. Categories narrow the type of prompt for this room." />
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(event) => onCategoryChange(event.target.value)}
                    className={selectClass}
                  >
                    {categoryOptions.map((category) => (
                      <option key={category} value={category}>
                        {formatCategoryLabel(category)}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-sm font-bold leading-snug text-zinc-500">
                    Pick a theme for Classic prompts, or keep Random for the full chaos deck.
                  </p>
                </div>
              )}

              <div className={cardClass}>
                <div className="mb-3 flex items-center gap-2">
                  <p className="text-sm font-black uppercase tracking-[0.22em] text-rose-700">
                    Humor rating
                  </p>
                  <HelpTooltip text="Everyone keeps prompts and image instructions cleaner. PG-13 allows bathroom jokes, roasts, and awkward-family chaos without going explicit." />
                </div>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => onContentRatingChange("everyone")}
                    className={`rounded-2xl border-2 p-2.5 text-left transition sm:p-4 ${
                      selectedContentRating === "everyone"
                        ? "border-black bg-emerald-50 shadow-[4px_4px_0_#111827]"
                        : "border-zinc-200 bg-white hover:border-black"
                    }`}
                  >
                    <span className="block text-sm font-black sm:text-lg">Everyone</span>
                    <span className="text-xs font-bold text-zinc-500 sm:text-sm">Cleaner party chaos</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onContentRatingChange("pg13")}
                    className={`rounded-2xl border-2 p-2.5 text-left transition sm:p-4 ${
                      selectedContentRating === "pg13"
                        ? "border-black bg-amber-100 shadow-[4px_4px_0_#111827]"
                        : "border-zinc-200 bg-white hover:border-black"
                    }`}
                  >
                    <span className="block text-sm font-black sm:text-lg">PG-13</span>
                    <span className="text-xs font-bold text-zinc-500 sm:text-sm">Roasts, bathroom jokes, awkward family stuff</span>
                  </button>
                </div>
              </div>

              <div className={cardClass}>
                <label className="mb-2 flex items-center gap-2 text-sm font-black uppercase tracking-[0.22em] text-rose-700">
                  Prompt style
                  <HelpTooltip text="This controls the visual art style for every generated image in the round." />
                </label>
                <select
                  value={selectedImageStyle}
                  onChange={(event) => onImageStyleChange(event.target.value)}
                  className={selectClass}
                >
                  <option value="prompt">Prompt&apos;s style</option>
                  <option value="cartoon">Colorful Cartoon</option>
                  <option value="comic_book">Comic Book</option>
                  <option value="clay_animation">Clay Animation</option>
                  <option value="storybook">Storybook</option>
                  <option value="pixel_art">Pixel Art</option>
                  <option value="puppet_show">Puppet Show</option>
                  <option value="childrens_picture_book">Children&apos;s Picture Book</option>
                  <option value="lego_stop_motion">LEGO Stop-Motion</option>
                  <option value="minecraft">Minecraft</option>
                  <option value="renaissance_painting">Renaissance Painting</option>
                </select>
                <p className="mt-2 text-sm font-bold leading-snug text-zinc-500">
                  {imageStyleDescriptions[selectedImageStyle] || imageStyleDescriptions.cartoon}
                </p>
              </div>

              <div className={cardClass}>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full border-2 border-black bg-rose-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-rose-800">
                    {selectedPartyMode ? "Party Mode" : "Phone Mode"}
                  </span>
                  <HelpTooltip text="This was set when the game was created on the homepage. Phone Mode: everyone answers, watches, and votes right on their own phone. Party Mode: a TV or computer is a dedicated presenter screen that reveals images one at a time - phones become reaction remotes during the reveal instead." />
                </div>
                <p className="mt-2 text-sm font-bold leading-snug text-zinc-500">
                  {selectedPartyMode
                    ? "A TV or laptop open on TV Mode is the shared presenter - it's a separate screen everyone watches, not one of the players' phones."
                    : "Everyone answers, watches, and votes right on their own phone."}
                </p>

                {selectedPartyMode && (
                  <p
                    className={`mt-3 rounded-2xl border px-4 py-3 text-sm font-black ${
                      isTvConnected
                        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                        : "border-amber-200 bg-amber-50 text-amber-900"
                    }`}
                  >
                    {isTvConnected
                      ? "TV connected ✓ You're ready to start."
                      : "Open TV Mode below on a shared screen to continue."}
                  </p>
                )}

                <button
                  onClick={onStartGame}
                  disabled={isStarting || !hasSelectedGameMode || (selectedPartyMode && !isTvConnected)}
                  className="mt-4 w-full rounded-2xl bg-rose-600 px-6 py-4 text-lg font-black text-white shadow-[4px_4px_0_#111827] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isStarting ? "Starting..." : "Start Game"}
                </button>

                {!hasSelectedGameMode ? (
                  <p className="mt-3 text-center text-sm font-black text-rose-700">
                    Choose a game mode first.
                  </p>
                ) : selectedPartyMode && !isTvConnected ? (
                  <p className="mt-3 text-center text-sm font-black text-rose-700">
                    Waiting for a TV or laptop to connect in TV Mode.
                  </p>
                ) : (
                  players.length === 1 && (
                    <p className="mt-3 text-center text-sm font-black text-zinc-500">
                      Playing solo - you&apos;ll be crowned the winner automatically. Share the room
                      code anytime to bring in friends.
                    </p>
                  )
                )}
              </div>

              <div className={cardClass}>
                <button
                  type="button"
                  onClick={onToggleRoundCustomization}
                  aria-expanded={isRoundCustomizationOpen}
                  className="flex w-full items-center justify-between rounded-2xl border-2 border-black bg-rose-50 px-4 py-3 font-black text-rose-900"
                >
                  <span>{isRoundCustomizationOpen ? "Hide Round Settings" : "Customize Round"}</span>
                  <span aria-hidden="true">{isRoundCustomizationOpen ? "-" : "+"}</span>
                </button>

                {isRoundCustomizationOpen && (
                  <div className="mt-3 grid grid-cols-1 gap-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 flex items-center gap-2 text-sm font-black text-rose-700">
                        Answer timer
                        <HelpTooltip text="How long players have to submit an answer. Unlimited keeps the round open until everyone finishes or the host reveals." />
                      </label>
                      <select
                        value={selectedRoundDuration}
                        onChange={(event) =>
                          onRoundDurationChange(
                            event.target.value === "unlimited" ? "unlimited" : Number(event.target.value)
                          )
                        }
                        className={selectClass}
                      >
                        <option value="unlimited">Unlimited</option>
                        <option value={60}>1 minute</option>
                        <option value={90}>1 minute 30 seconds</option>
                        <option value={120}>2 minutes</option>
                        <option value={180}>3 minutes</option>
                        <option value={300}>5 minutes</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 flex items-center gap-2 text-sm font-black text-rose-700">
                        Voting timer
                        <HelpTooltip text="How long players have to vote once images are revealed. The host can still end voting early." />
                      </label>
                      <select
                        value={selectedVotingDuration}
                        onChange={(event) => onVotingDurationChange(Number(event.target.value))}
                        className={selectClass}
                      >
                        <option value={30}>30 seconds</option>
                        <option value={45}>45 seconds</option>
                        <option value={60}>1 minute</option>
                        <option value={90}>1 minute 30 seconds</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className={`${cardClass} text-center`}>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">
                  Invite your friends
                </p>
                <p className="mt-1 text-4xl font-black tracking-widest text-rose-700">{code}</p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={onCopyRoomCode}
                    className="rounded-xl bg-zinc-950 px-4 py-3 font-black text-white"
                  >
                    Copy Code
                  </button>
                  <button
                    type="button"
                    onClick={onShareRoom}
                    className="rounded-xl bg-rose-600 px-4 py-3 font-black text-white"
                  >
                    Share Game
                  </button>
                </div>
                {roomShareMessage && (
                  <p className="mt-2 text-sm font-black text-emerald-700">{roomShareMessage}</p>
                )}
                <a
                  href={`/game/${code}/tv`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 block rounded-xl border-2 border-black bg-white px-4 py-3 font-black text-zinc-950"
                >
                  Open TV Mode
                </a>
                <p className="mt-2 text-xs font-bold text-zinc-500">
                  Playing on one screen? Cast this to a TV so everyone watches together instead of
                  staring at their own phone.
                </p>
              </div>
            </>
          ) : hostName ? (
            <div className={`${cardClass} text-center`}>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-rose-700">
                You&apos;re in
              </p>
              <p className="mt-2 text-xl font-black">
                {hasSelectedGameMode
                  ? `${getGameModeLabel(selectedGameMode)} mode`
                  : "Waiting for the host to choose a mode"}
              </p>
              <p className="mt-2 text-sm font-bold text-zinc-500">
                Waiting for {hostName} to start the game...
              </p>
            </div>
          ) : (
            <div className={`${cardClass} text-center`}>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-rose-700">
                No host yet
              </p>
              <p className="mt-2 text-sm font-bold text-zinc-500">
                Someone needs to run this game - claim it, or wait and one of you will be made host
                automatically in a bit.
              </p>
              <button
                type="button"
                onClick={onClaimHost}
                className="mt-4 w-full rounded-2xl bg-rose-600 px-6 py-4 text-lg font-black text-white shadow-[4px_4px_0_#111827]"
              >
                Become the Host
              </button>
            </div>
          )}
        </div>
      </div>

      <PromptSuggestionPanel
        playerName={playerName}
        suggestions={promptSuggestions}
        suggestionText={promptSuggestionText}
        suggestionMode={selectedGameMode}
        hasSelectedGameMode={hasSelectedGameMode}
        suggestionRating={promptSuggestionRating}
        approvalVotesNeeded={promptApprovalVotesNeeded}
        isSubmittingSuggestion={isSubmittingPromptSuggestion}
        onSuggestionTextChange={onPromptSuggestionTextChange}
        onSubmitSuggestion={onSubmitPromptSuggestion}
        onVoteSuggestion={onVotePromptSuggestion}
      />
    </>
  );
}
