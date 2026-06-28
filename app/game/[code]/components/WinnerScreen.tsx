import type { Player, RoundHistoryItem, ScoreboardPlayer } from "./types";

type ConfettiPiece = {
  color: string;
  delay: string;
  left: string;
  rotation: string;
};

type WinnerScreenProps = {
  code: string;
  confettiPieces: ConfettiPiece[];
  winnerImages: string[];
  winnerName: string;
  winnerPrompt: string;
  winner: string;
  players: Player[];
  scoreboardPlayers: ScoreboardPlayer[];
  finalWinner: string;
  roundHistory: RoundHistoryItem[];
  isHost: boolean;
  hostName?: string;
  isPlayingAgain: boolean;
  isAdvancing: boolean;
  onPlayAgain: () => void;
  onNextRound: () => void;
  onReturnToLobby: () => void;
};

function normalizeName(playerName?: string | null) {
  return (playerName || "").trim().toLowerCase();
}

function EmptyAvatar() {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-black bg-rose-100 text-sm font-black text-rose-800">
      ?
    </div>
  );
}

export function WinnerScreen({
  code,
  confettiPieces,
  winnerImages,
  winnerName,
  winnerPrompt,
  winner,
  players,
  scoreboardPlayers,
  finalWinner,
  roundHistory,
  isHost,
  hostName,
  isPlayingAgain,
  isAdvancing,
  onPlayAgain,
  onNextRound,
  onReturnToLobby,
}: WinnerScreenProps) {
  function findPlayerAvatar(playerName?: string | null) {
    const normalizedName = normalizeName(playerName);
    if (!normalizedName) return null;

    return players.find((player) => normalizeName(player.name) === normalizedName)?.avatar_url || null;
  }

  const safeWinnerName = winnerName || "";
  const winnerNames = safeWinnerName.startsWith("Tie: ")
    ? safeWinnerName.replace("Tie: ", "").split(" and ").map((name) => name.trim()).filter(Boolean)
    : safeWinnerName
      ? [safeWinnerName]
      : [];
  const winnerAvatars = winnerNames
    .map((name) => ({ name, avatarUrl: findPlayerAvatar(name) }))
    .filter((winnerAvatar) => winnerAvatar.avatarUrl);
  const galleryUrl = `/game/${code}/gallery`;

  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
        {confettiPieces.map((piece, index) => (
          <span
            key={index}
            className="absolute"
            style={{
              animation: "confetti-fall 2.8s ease-in infinite",
              animationDelay: piece.delay,
              backgroundColor: piece.color,
              height: "16px",
              left: piece.left,
              top: "-24px",
              transform: `rotate(${piece.rotation})`,
              width: "10px",
            }}
          />
        ))}
      </div>

      <div className="w-full max-w-md rounded-[2rem] border-2 border-black bg-white p-6 text-center text-zinc-950 shadow-[8px_8px_0_#111827]">
        <p className="mb-2 text-xs font-black uppercase tracking-[0.24em] text-rose-700">Results</p>
        <h2 className="mb-4 text-4xl font-black">
          {winnerImages.length > 1 ? "Tie Winners" : "Round Winner"}
        </h2>

        <div className={`mb-5 grid gap-4 ${winnerImages.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
          {winnerImages.map((imageUrl, index) => (
            <img
              key={index}
              src={imageUrl}
              alt="Winning image"
              className="aspect-square w-full rounded-2xl border-2 border-black object-cover"
            />
          ))}
        </div>

        <div className="relative rounded-2xl border-2 border-black bg-rose-50 p-4 text-black">
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full border-2 border-black bg-amber-300 px-3 py-1 text-xs font-black uppercase tracking-wider">
            Winner
          </div>

          {winnerAvatars.length > 0 && (
            <div className="mb-3 mt-4 flex justify-center">
              <div className="flex -space-x-3">
                {winnerAvatars.map((winnerAvatar) => (
                  <img
                    key={winnerAvatar.name}
                    src={winnerAvatar.avatarUrl || ""}
                    alt={winnerAvatar.name}
                    title={winnerAvatar.name}
                    className="h-16 w-16 rounded-full border-4 border-white object-cover shadow-lg"
                  />
                ))}
              </div>
            </div>
          )}

          <p className="mt-4 text-3xl font-black">{winnerName || "Calculating..."}</p>
          <p className="mt-1 text-sm font-bold text-zinc-500">
            {winnerImages.length > 1 ? "tied for the round" : "won the round"}
          </p>
          <p className="mt-4 text-lg font-black">{`"${winnerPrompt || winner}"`}</p>
        </div>
      </div>

      <div className="w-full max-w-md rounded-[2rem] border-2 border-black bg-white p-5 shadow-[8px_8px_0_#111827]">
        <h3 className="mb-4 text-center text-3xl font-black">Scoreboard</h3>

        <div className="flex flex-col gap-3">
          {scoreboardPlayers.map((player, index) => (
            <div
              key={player.name}
              className={`flex items-center justify-between rounded-2xl px-4 py-3 font-black ${
                index === 0
                  ? "border-2 border-black bg-amber-100 text-amber-950"
                  : "border border-sky-200 bg-sky-100 text-sky-950"
              }`}
            >
              <div className="flex items-center gap-3">
                {player.avatar_url ? (
                  <div className="relative">
                    <img
                      src={player.avatar_url}
                      alt={player.name}
                      className="h-12 w-12 rounded-full border-2 border-black object-cover"
                    />
                    {index === 0 && (
                      <span className="absolute -right-1 -top-1 rounded-full border border-black bg-amber-300 px-1.5 text-[10px] font-black">
                        1
                      </span>
                    )}
                  </div>
                ) : (
                  <EmptyAvatar />
                )}

                <div className="min-w-0 text-left">
                  <p className="truncate">{player.name}</p>
                  <p className="text-xs font-bold opacity-70">{index === 0 ? "Current leader" : `Place ${index + 1}`}</p>
                </div>
              </div>

              <span className="rounded-full border border-black bg-white px-3 py-1">{player.points ?? 0}</span>
            </div>
          ))}
        </div>
      </div>

      {roundHistory.length > 0 && (
        <div className="w-full max-w-md rounded-[2rem] border-2 border-black bg-white p-5 text-center shadow-[8px_8px_0_#111827]">
          <h3 className="text-2xl font-black">Share the chaos</h3>
          <p className="mt-2 text-sm font-bold text-zinc-500">
            Send friends the recap gallery for this room.
          </p>
          <a
            href={galleryUrl}
            className="mt-4 block rounded-2xl bg-zinc-950 px-6 py-4 font-black text-white shadow-[4px_4px_0_#fb7185]"
          >
            Open Share Gallery
          </a>
        </div>
      )}

      {finalWinner && (
        <div className="max-w-4xl rounded-[2rem] border-2 border-black bg-amber-100 p-5 text-center shadow-[8px_8px_0_#111827]">
          <h3 className="text-3xl font-black">Final Winner</h3>
          <p className="mt-2 text-xl font-black">{finalWinner}</p>

          <div className="mt-8">
            <h4 className="mb-4 text-2xl font-black">Round History</h4>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {roundHistory.map((round) => {
                const roundWinnerName = round.winner_name || "Unknown winner";
                const roundWinnerAvatar = findPlayerAvatar(round.winner_name);
                const displayImage = round.gallery_thumbnail_url || round.winner_image_url;

                return (
                  <div key={round.id} className="rounded-2xl border-2 border-black bg-white p-3 text-black shadow-[4px_4px_0_#111827]">
                    <p className="mb-2 font-black">Round {round.round_number}</p>

                    {displayImage && (
                      <img
                        src={displayImage}
                        alt={round.winner_prompt}
                        className="mb-2 aspect-square w-full rounded-xl object-cover"
                      />
                    )}

                    <div className="flex items-center justify-center gap-2 font-black">
                      {roundWinnerAvatar && (
                        <img
                          src={roundWinnerAvatar}
                          alt={roundWinnerName}
                          className="h-8 w-8 rounded-full border-2 border-amber-300 object-cover"
                        />
                      )}
                      <span>{roundWinnerName}</span>
                    </div>
                    <p className="text-sm font-bold text-zinc-600">{`"${round.winner_prompt}"`}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {finalWinner && isHost && (
        <div className="w-full max-w-md rounded-[2rem] border-2 border-black bg-white p-5 text-center shadow-[8px_8px_0_#111827]">
          <h3 className="text-2xl font-black">Start a fresh game?</h3>
          <p className="mt-2 text-sm font-bold text-zinc-500">
            This keeps the same room and players, but resets everyone&apos;s score.
          </p>
          <button
            type="button"
            onClick={onPlayAgain}
            disabled={isPlayingAgain}
            className="mt-4 w-full rounded-2xl bg-rose-600 px-8 py-4 font-black text-white shadow-[4px_4px_0_#111827] disabled:opacity-50"
          >
            {isPlayingAgain ? "Resetting Game..." : "Rematch in This Room"}
          </button>
        </div>
      )}

      {finalWinner && !isHost && (
        <p className="text-center font-bold text-zinc-500">
          Waiting for {hostName || "the host"} to start a rematch...
        </p>
      )}

      {!finalWinner && isHost && (
        <div className="w-full max-w-md rounded-[2rem] border-2 border-black bg-white p-5 text-center shadow-[8px_8px_0_#111827]">
          <h3 className="text-2xl font-black">Keep the game moving</h3>
          <p className="mt-2 text-sm font-bold text-zinc-500">
            Start another round, or return to the lobby to change settings.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              onClick={onNextRound}
              disabled={isAdvancing}
              className="rounded-2xl bg-rose-600 px-6 py-4 font-black text-white shadow-[4px_4px_0_#111827] disabled:opacity-50"
            >
              {isAdvancing ? "Starting..." : "Next Round"}
            </button>
            <button
              type="button"
              onClick={onReturnToLobby}
              disabled={isAdvancing}
              className="rounded-2xl border-2 border-black bg-white px-6 py-4 font-black text-zinc-950 disabled:opacity-50"
            >
              Back to Lobby
            </button>
          </div>
        </div>
      )}

      {!finalWinner && !isHost && (
        <p className="text-center font-bold text-zinc-500">
          Waiting for {hostName || "the host"} to start the next round...
        </p>
      )}
    </>
  );
}
