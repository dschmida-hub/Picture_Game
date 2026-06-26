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
        <p className="text-xs font-extrabold uppercase tracking-[0.25em] text-purple-600">
          Room {code}
        </p>
        <h2 className="mt-1 text-3xl font-black md:text-5xl">Waiting for Players</h2>
        <p className="mt-2 text-sm font-bold text-purple-600">
          {players.length} / {maxPlayers} players in the room
        </p>
        <button
          type="button"
          onClick={() => setIsHowToPlayOpen(true)}
          className="mt-4 rounded-full border border-purple-200 bg-white px-5 py-2.5 text-sm font-extrabold text-purple-700 shadow-sm"
        >
          How to play
        </button>
      </div>

      {isHowToPlayOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[2rem] border-4 border-black bg-white p-5 text-black shadow-2xl md:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.25em] text-purple-600">
                  Quick rules
                </p>
                <h3 className="mt-2 text-3xl font-black">How to play</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsHowToPlayOpen(false)}
                className="rounded-full bg-gray-100 px-3 py-2 text-sm font-black"
                aria-label="Close how to play"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {[
                ["1", "Answer the prompt", "Write something short, specific, and funny."],
                ["2", "AI draws the chaos", "Your answer turns into an anonymous image."],
                ["3", "Vote for funniest", "Pick the image that gets the biggest laugh."],
                ["4", "First to 3 wins", "Keep playing rounds until someone takes the crown."],
              ].map(([number, title, description]) => (
                <div key={number} className="flex gap-3 rounded-2xl bg-purple-50 p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-600 font-black text-white">
                    {number}
                  </div>
                  <div>
                    <p className="font-black">{title}</p>
                    <p className="text-sm font-bold text-gray-600">{description}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setIsHowToPlayOpen(false)}
              className="mt-5 w-full rounded-2xl bg-black px-5 py-3 font-extrabold text-white"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      <div className="grid w-full max-w-6xl grid-cols-1 items-start gap-4 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:gap-6">
        <div className="order-2 rounded-3xl border border-purple-200 bg-white p-4 shadow-lg md:order-1 md:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-extrabold">Players</h3>
              <p className="text-sm text-gray-500">
                {openSlots === 0
                  ? "The room is full!"
                  : `Waiting for ${openSlots} more player${openSlots === 1 ? "" : "s"}.`}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-purple-100 px-3 py-1 text-sm font-extrabold text-purple-700">
              {players.length} / {maxPlayers}
            </span>
          </div>

          <div className="mb-4 grid gap-1" style={{ gridTemplateColumns: `repeat(${maxPlayers}, minmax(0, 1fr))` }}>
            {Array.from({ length: maxPlayers }, (_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full ${index < players.length ? "bg-purple-600" : "bg-gray-200"}`}
              />
            ))}
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-1">
            {players.map((player) => (
              <div key={player.name} className="flex items-center gap-3 rounded-2xl border p-3">
                {player.avatar_url ? (
                  <img
                    src={player.avatar_url}
                    alt={player.name}
                    className="h-12 w-12 rounded-full border-2 border-purple-500 object-cover md:h-14 md:w-14"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 text-xl">
                    👤
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold">
                    {player.name}
                    {player.is_host && <span className="ml-2 text-yellow-500">👑 Host</span>}
                  </div>
                  <div className="text-sm text-gray-500">{player.points} pts</div>
                </div>
                {isHost && !player.is_host && (
                  <button
                    type="button"
                    onClick={() => onRemovePlayer(player)}
                    className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-extrabold text-red-700"
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
              <div className="rounded-3xl border border-purple-200 bg-white p-4 shadow-lg md:p-5">
                <p className="mb-3 text-sm font-extrabold uppercase tracking-wider text-purple-700">
                  Choose game mode
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => onGameModeChange("classic")}
                    className={`rounded-2xl border-2 p-4 text-left transition ${
                      selectedGameMode === "classic"
                        ? "border-purple-600 bg-purple-50 shadow-sm"
                        : "border-gray-100 bg-gray-50 hover:border-purple-200"
                    }`}
                  >
                    <span className="block text-lg font-extrabold">Classic</span>
                    <span className="text-sm text-gray-500">Write a funny answer</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onGameModeChange("cards")}
                    className={`rounded-2xl border-2 p-4 text-left transition ${
                      selectedGameMode === "cards"
                        ? "border-black bg-black text-white shadow-sm"
                        : "border-gray-100 bg-gray-50 hover:border-purple-200"
                    }`}
                  >
                    <span className="block text-lg font-extrabold">Fill in the Blank</span>
                    <span className={`text-sm ${selectedGameMode === "cards" ? "text-gray-300" : "text-gray-500"}`}>
                      Complete a prompt card
                    </span>
                  </button>
                </div>
              </div>

              <div className="rounded-3xl border border-green-200 bg-white p-4 text-center shadow-lg">
                <button
                  onClick={onStartGame}
                  disabled={isStarting || players.length < 2}
                  className="w-full rounded-2xl bg-green-600 px-6 py-4 text-lg font-extrabold text-white shadow-lg disabled:opacity-50"
                >
                  {isStarting ? "Starting..." : "Start Game"}
                </button>

                {players.length < 2 && (
                  <p className="mt-3 text-sm font-bold text-purple-700">
                    Waiting for one more player to join.
                  </p>
                )}
              </div>

              <div className="rounded-3xl border border-purple-200 bg-white p-4 shadow-lg">
                <button
                  type="button"
                  onClick={onToggleRoundCustomization}
                  aria-expanded={isRoundCustomizationOpen}
                  className="flex w-full items-center justify-between rounded-2xl border border-purple-100 bg-purple-50 px-4 py-3 font-extrabold text-purple-700"
                >
                  <span>{isRoundCustomizationOpen ? "Hide Round Settings" : "Customize Round"}</span>
                  <span aria-hidden="true">{isRoundCustomizationOpen ? "−" : "+"}</span>
                </button>

                {isRoundCustomizationOpen && (
                  <div className="mt-3 grid grid-cols-1 gap-4 rounded-2xl bg-purple-50 p-4 sm:grid-cols-2">
                    {selectedGameMode === "classic" && (
                      <div>
                        <label className="mb-2 block text-sm font-bold text-purple-600">
                          Prompt category
                        </label>
                        <select
                          value={selectedCategory}
                          onChange={(event) => onCategoryChange(event.target.value)}
                          className="w-full rounded-xl border bg-white p-3"
                        >
                          <option value="Random">🎲 Random</option>
                          <option value="personal">👥 Personal</option>
                          <option value="history">🏰 History</option>
                          <option value="animals">🐻 Animals</option>
                          <option value="sports">🏈 Sports</option>
                          <option value="food">🍕 Food</option>
                          <option value="work">💼 Work</option>
                          <option value="general">🎉 General</option>
                          <option value="chaos">🤪 Chaos</option>
                          <option value="dating">❤️ Dating</option>
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="mb-2 block text-sm font-bold text-purple-600">
                        Image style
                      </label>
                      <select
                        value={selectedImageStyle}
                        onChange={(event) => onImageStyleChange(event.target.value)}
                        className="w-full rounded-xl border bg-white p-3"
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
                      <label className="mb-2 block text-sm font-bold text-purple-600">
                        Answer timer
                      </label>
                      <select
                        value={selectedRoundDuration}
                        onChange={(event) =>
                          onRoundDurationChange(
                            event.target.value === "unlimited" ? "unlimited" : Number(event.target.value)
                          )
                        }
                        className="w-full rounded-xl border bg-white p-3"
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
                      <label className="mb-2 block text-sm font-bold text-purple-600">
                        Voting timer
                      </label>
                      <select
                        value={selectedVotingDuration}
                        onChange={(event) => onVotingDurationChange(Number(event.target.value))}
                        className="w-full rounded-xl border bg-white p-3"
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

              <div className="rounded-3xl border border-purple-200 bg-white p-4 text-center shadow-lg">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Invite your friends
                </p>
                <p className="mt-1 text-4xl font-black tracking-widest text-purple-700">
                  {code}
                </p>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={onCopyRoomCode}
                    className="rounded-xl bg-black px-4 py-3 font-bold text-white"
                  >
                    Copy Code
                  </button>
                  <button
                    type="button"
                    onClick={onShareRoom}
                    className="rounded-xl bg-purple-600 px-4 py-3 font-bold text-white"
                  >
                    Share Game
                  </button>
                </div>
                {roomShareMessage && (
                  <p className="mt-2 text-sm font-bold text-green-700">{roomShareMessage}</p>
                )}
              </div>
            </>
          ) : (
            <div className="rounded-3xl border border-purple-200 bg-white p-5 text-center shadow-lg">
              <p className="text-xs font-extrabold uppercase tracking-wider text-purple-600">
                You’re in
              </p>
              <p className="mt-2 text-xl font-black">
                {selectedGameMode === "cards" ? "Fill in the Blank" : "Classic"} mode
              </p>
              <p className="mt-2 text-sm font-bold text-gray-500">
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
