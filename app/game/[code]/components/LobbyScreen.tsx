import type { GameMode, Player, RoundDuration } from "./types";

type LobbyScreenProps = {
  code: string;
  players: Player[];
  maxPlayers: number;
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
  onGameModeChange: (mode: GameMode) => void;
  onCategoryChange: (category: string) => void;
  onImageStyleChange: (style: string) => void;
  onRoundDurationChange: (duration: RoundDuration) => void;
  onVotingDurationChange: (duration: number) => void;
  onToggleRoundCustomization: () => void;
  onStartGame: () => void;
  onCopyRoomCode: () => void;
  onShareRoom: () => void;
};

export function LobbyScreen({
  code,
  players,
  maxPlayers,
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
  onGameModeChange,
  onCategoryChange,
  onImageStyleChange,
  onRoundDurationChange,
  onVotingDurationChange,
  onToggleRoundCustomization,
  onStartGame,
  onCopyRoomCode,
  onShareRoom,
}: LobbyScreenProps) {
  return (
    <>
      <div className="text-center">
        <h2 className="text-3xl font-black">Waiting for Players</h2>
        <p className="mt-1 text-sm font-bold text-purple-600">
          {players.length} / {maxPlayers} players in the room
        </p>
      </div>

      <div className="grid w-full max-w-5xl grid-cols-1 items-start gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-purple-200 bg-white p-5 shadow-lg">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-extrabold">Players</h3>
              <p className="text-sm text-gray-500">
                {players.length === maxPlayers
                  ? "The room is full!"
                  : `Waiting for ${maxPlayers - players.length} more player${
                      maxPlayers - players.length === 1 ? "" : "s"
                    }.`}
              </p>
            </div>
            <span className="rounded-full bg-purple-100 px-3 py-1 text-sm font-extrabold text-purple-700">
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

          <div className="flex flex-col gap-2">
            {players.map((player) => (
              <div key={player.name} className="flex items-center gap-3 rounded-xl border p-3">
                {player.avatar_url ? (
                  <img
                    src={player.avatar_url}
                    alt={player.name}
                    className="h-16 w-16 rounded-full border-2 border-purple-500 object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-300">
                    👤
                  </div>
                )}

                <div>
                  <div className="font-bold">
                    {player.name}
                    {player.is_host && <span className="ml-2 text-yellow-500">👑 Host</span>}
                  </div>
                  <div className="text-sm text-gray-500">{player.points} pts</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex w-full flex-col gap-4">
          {isHost ? (
            <>
              <div className="w-full max-w-xl rounded-2xl border border-purple-200 bg-purple-50 p-4">
                <p className="mb-3 text-sm font-extrabold uppercase tracking-wider text-purple-700">
                  Choose game mode
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => onGameModeChange("classic")}
                    className={`rounded-xl border-2 p-3 text-left transition ${
                      selectedGameMode === "classic"
                        ? "border-purple-600 bg-white shadow-sm"
                        : "border-transparent bg-white/60 hover:border-purple-200"
                    }`}
                  >
                    <span className="block font-extrabold">Classic</span>
                    <span className="text-xs text-gray-500">Write a funny answer</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onGameModeChange("cards")}
                    className={`rounded-xl border-2 p-3 text-left transition ${
                      selectedGameMode === "cards"
                        ? "border-black bg-black text-white shadow-sm"
                        : "border-transparent bg-white/60 hover:border-purple-200"
                    }`}
                  >
                    <span className="block font-extrabold">Fill in the Blank</span>
                    <span className={`text-xs ${selectedGameMode === "cards" ? "text-gray-300" : "text-gray-500"}`}>
                      Complete a prompt card
                    </span>
                  </button>
                </div>
              </div>

              <button
                onClick={onStartGame}
                disabled={isStarting || players.length < 2}
                className="w-full max-w-xl rounded-2xl bg-green-600 px-6 py-4 font-extrabold text-white shadow-lg disabled:opacity-50"
              >
                {isStarting ? "Starting..." : "Start Game"}
              </button>

              {players.length < 2 && (
                <p className="text-center text-sm font-bold text-purple-700">
                  Waiting for one more player to join.
                </p>
              )}

              <div className="w-full max-w-xl">
                <button
                  type="button"
                  onClick={onToggleRoundCustomization}
                  aria-expanded={isRoundCustomizationOpen}
                  className="w-full rounded-xl border border-purple-200 px-4 py-3 font-bold text-purple-700"
                >
                  {isRoundCustomizationOpen ? "Hide Round Settings" : "Customize Round"}
                </button>

                {isRoundCustomizationOpen && (
                  <div className="mt-3 grid grid-cols-1 gap-4 rounded-2xl border border-purple-200 bg-purple-50 p-4 md:grid-cols-3">
                    {selectedGameMode === "classic" && (
                      <div>
                        <label className="mb-2 block text-sm font-bold text-purple-600">
                          Prompt category
                        </label>
                        <select
                          value={selectedCategory}
                          onChange={(event) => onCategoryChange(event.target.value)}
                          className="w-full rounded-xl border p-3"
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

                    <div className="w-full max-w-xl">
                      <label className="mb-2 block text-sm font-bold text-purple-600">
                        Image style
                      </label>
                      <select
                        value={selectedImageStyle}
                        onChange={(event) => onImageStyleChange(event.target.value)}
                        className="w-full rounded-xl border p-3"
                      >
                        <option value="prompt">Prompt's style</option>
                        <option value="cartoon">Colorful Cartoon</option>
                        <option value="comic_book">Comic Book</option>
                        <option value="clay_animation">Clay Animation</option>
                        <option value="storybook">Storybook</option>
                        <option value="pixel_art">Pixel Art</option>
                      </select>
                    </div>

                    <div className="w-full max-w-xl">
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
                        className="w-full rounded-xl border p-3"
                      >
                        <option value="unlimited">Unlimited</option>
                        <option value={60}>1 minute</option>
                        <option value={90}>1 minute 30 seconds</option>
                        <option value={120}>2 minutes</option>
                        <option value={180}>3 minutes</option>
                        <option value={300}>5 minutes</option>
                      </select>
                    </div>

                    <div className="w-full max-w-xl">
                      <label className="mb-2 block text-sm font-bold text-purple-600">
                        Voting timer
                      </label>
                      <select
                        value={selectedVotingDuration}
                        onChange={(event) => onVotingDurationChange(Number(event.target.value))}
                        className="w-full rounded-xl border p-3"
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

              <div className="w-full max-w-xl rounded-2xl border border-purple-200 bg-white p-4 text-center shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Invite your friends
                </p>
                <p className="mt-1 text-3xl font-black tracking-widest text-purple-700">
                  {code}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3">
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
            <div className="w-full max-w-xl rounded-2xl border border-purple-200 bg-purple-50 p-4 text-center">
              <p className="font-bold">
                Game mode: {selectedGameMode === "cards" ? "Fill in the Blank" : "Classic"}
              </p>
              <p className="mt-2 text-sm text-gray-500">
                Waiting for {hostName || "the host"} to start the game...
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
