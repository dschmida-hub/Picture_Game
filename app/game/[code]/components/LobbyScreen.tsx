import { useState } from "react";
import { PromptSuggestionPanel } from "./PromptSuggestionPanel";
import type { GameMode, Player, PromptRating, PromptSuggestion, RoundDuration } from "./types";

type LobbyScreenProps = {
  code: string;
  players: Player[];
  maxPlayers: number;
  playerName: string;
  isHost: boolean;
  hostName?: string;
  selectedGameMode: GameMode;
  selectedCategory: string;
  selectedImageStyle: string;
  selectedRoundDuration: RoundDuration;
  selectedVotingDuration: number;
  isStarting: boolean;
  isRoundCustomizationOpen: boolean;
  roomShareMessage: string;
  roomExpirationMessage: string;
  promptSuggestions: PromptSuggestion[];
  promptSuggestionText: string;
  promptSuggestionMode: GameMode;
  promptSuggestionRating: PromptRating;
  promptApprovalVotesNeeded: number;
  isSubmittingPromptSuggestion: boolean;
  onGameModeChange: (mode: GameMode) => void;
  onCategoryChange: (category: string) => void;
  onImageStyleChange: (style: string) => void;
  onRoundDurationChange: (duration: RoundDuration) => void;
  onVotingDurationChange: (duration: number) => void;
  onToggleRoundCustomization: () => void;
  onStartGame: () => void;
  onCopyRoomCode: () => void;
  onShareRoom: () => void;
  onPromptSuggestionTextChange: (value: string) => void;
  onPromptSuggestionModeChange: (mode: GameMode) => void;
  onSubmitPromptSuggestion: () => void;
  onVotePromptSuggestion: (suggestionId: number) => void;
  onRemovePlayer: (player: Player) => void;
};

const cardClass = "rounded-[2rem] border-2 border-black bg-white p-4 shadow-[8px_8px_0_#111827] md:p-5";
const selectClass = "w-full rounded-xl border-2 border-black bg-white p-3 font-bold";

export function LobbyScreen({
  code,
  players,
  maxPlayers,
  playerName,
  isHost,
  hostName,
  selectedGameMode,
  selectedCategory,
  selectedImageStyle,
  selectedRoundDuration,
  selectedVotingDuration,
  isStarting,
  isRoundCustomizationOpen,
  roomShareMessage,
  roomExpirationMessage,
  promptSuggestions,
  promptSuggestionText,
  promptSuggestionMode,
  promptSuggestionRating,
  promptApprovalVotesNeeded,
  isSubmittingPromptSuggestion,
  onGameModeChange,
  onCategoryChange,
  onImageStyleChange,
  onRoundDurationChange,
  onVotingDurationChange,
  onToggleRoundCustomization,
  onStartGame,
  onCopyRoomCode,
  onShareRoom,
  onPromptSuggestionTextChange,
  onPromptSuggestionModeChange,
  onSubmitPromptSuggestion,
  onVotePromptSuggestion,
  onRemovePlayer,
}: LobbyScreenProps) {
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false);
  const openSlots = maxPlayers - players.length;

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
                {player.avatar_url ? (
                  <img
                    src={player.avatar_url}
                    alt={player.name}
                    className="h-12 w-12 rounded-full border-2 border-black object-cover md:h-14 md:w-14"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-black bg-rose-100 text-sm font-black text-rose-800">
                    ?
                  </div>
                )}

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
                <p className="mb-3 text-sm font-black uppercase tracking-[0.22em] text-rose-700">
                  Choose game mode
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => onGameModeChange("classic")}
                    className={`rounded-2xl border-2 p-4 text-left transition ${
                      selectedGameMode === "classic"
                        ? "border-black bg-rose-50 shadow-[4px_4px_0_#111827]"
                        : "border-zinc-200 bg-white hover:border-black"
                    }`}
                  >
                    <span className="block text-lg font-black">Classic</span>
                    <span className="text-sm font-bold text-zinc-500">Write a funny answer</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onGameModeChange("cards")}
                    className={`rounded-2xl border-2 p-4 text-left transition ${
                      selectedGameMode === "cards"
                        ? "border-black bg-zinc-950 text-white shadow-[4px_4px_0_#fb7185]"
                        : "border-zinc-200 bg-white hover:border-black"
                    }`}
                  >
                    <span className="block text-lg font-black">Fill in the Blank</span>
                    <span className={`text-sm font-bold ${selectedGameMode === "cards" ? "text-zinc-300" : "text-zinc-500"}`}>
                      Complete a prompt card
                    </span>
                  </button>
                </div>
              </div>

              <div className={cardClass}>
                <button
                  onClick={onStartGame}
                  disabled={isStarting || players.length < 2}
                  className="w-full rounded-2xl bg-rose-600 px-6 py-4 text-lg font-black text-white shadow-[4px_4px_0_#111827] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isStarting ? "Starting..." : "Start Game"}
                </button>

                {players.length < 2 && (
                  <p className="mt-3 text-center text-sm font-black text-rose-700">
                    Waiting for one more player to join.
                  </p>
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
                    {selectedGameMode === "classic" && (
                      <div>
                        <label className="mb-2 block text-sm font-black text-rose-700">
                          Prompt category
                        </label>
                        <select
                          value={selectedCategory}
                          onChange={(event) => onCategoryChange(event.target.value)}
                          className={selectClass}
                        >
                          <option value="Random">Random</option>
                          <option value="personal">Personal</option>
                          <option value="history">History</option>
                          <option value="animals">Animals</option>
                          <option value="sports">Sports</option>
                          <option value="food">Food</option>
                          <option value="work">Work</option>
                          <option value="general">General</option>
                          <option value="chaos">Chaos</option>
                          <option value="dating">Dating</option>
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="mb-2 block text-sm font-black text-rose-700">
                        Image style
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
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-black text-rose-700">
                        Answer timer
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
                      <label className="mb-2 block text-sm font-black text-rose-700">
                        Voting timer
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
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
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
              </div>
            </>
          ) : (
            <div className={`${cardClass} text-center`}>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-rose-700">
                You&apos;re in
              </p>
              <p className="mt-2 text-xl font-black">
                {selectedGameMode === "cards" ? "Fill in the Blank" : "Classic"} mode
              </p>
              <p className="mt-2 text-sm font-bold text-zinc-500">
                Waiting for {hostName || "the host"} to start the game...
              </p>
            </div>
          )}
        </div>
      </div>

      <PromptSuggestionPanel
        playerName={playerName}
        suggestions={promptSuggestions}
        suggestionText={promptSuggestionText}
        suggestionMode={promptSuggestionMode}
        suggestionRating={promptSuggestionRating}
        approvalVotesNeeded={promptApprovalVotesNeeded}
        isSubmittingSuggestion={isSubmittingPromptSuggestion}
        onSuggestionTextChange={onPromptSuggestionTextChange}
        onSuggestionModeChange={onPromptSuggestionModeChange}
        onSubmitSuggestion={onSubmitPromptSuggestion}
        onVoteSuggestion={onVotePromptSuggestion}
      />
    </>
  );
}
