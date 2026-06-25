import type { RoundHistoryItem, ScoreboardPlayer } from "./types";

type ConfettiPiece = {
  color: string;
  delay: string;
  left: string;
  rotation: string;
};

type WinnerScreenProps = {
  confettiPieces: ConfettiPiece[];
  winnerImages: string[];
  winnerName: string;
  winnerPrompt: string;
  winner: string;
  scoreboardPlayers: ScoreboardPlayer[];
  finalWinner: string;
  roundHistory: RoundHistoryItem[];
  isHost: boolean;
  hostName?: string;
  isPlayingAgain: boolean;
  isAdvancing: boolean;
  onPlayAgain: () => void;
  onNextRound: () => void;
};

export function WinnerScreen({
  confettiPieces,
  winnerImages,
  winnerName,
  winnerPrompt,
  winner,
  scoreboardPlayers,
  finalWinner,
  roundHistory,
  isHost,
  hostName,
  isPlayingAgain,
  isAdvancing,
  onPlayAgain,
  onNextRound,
}: WinnerScreenProps) {
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

      <div className="w-full max-w-md rounded-3xl border-4 border-yellow-300 bg-gradient-to-b from-purple-700 to-purple-950 p-6 text-center text-white shadow-2xl">
        <h2 className="mb-4 text-4xl font-extrabold">
          {winnerImages.length > 1 ? "Tie Winners" : "Round Winner"}
        </h2>

        <div className={`mb-5 grid gap-4 ${winnerImages.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
          {winnerImages.map((imageUrl, index) => (
            <img
              key={index}
              src={imageUrl}
              alt="Winning image"
              className="aspect-square w-full rounded-2xl border-4 border-white object-cover shadow-xl"
            />
          ))}
        </div>

        <div className="relative rounded-2xl bg-white p-4 text-black">
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-5xl">👑</div>

          <p className="mt-4 text-3xl font-extrabold">{winnerName || "Calculating..."}</p>
          <p className="mt-1 text-sm text-gray-500">
            {winnerImages.length > 1 ? "tied for the round" : "won the round"}
          </p>
          <p className="mt-4 text-lg font-semibold">“{winnerPrompt || winner}”</p>
        </div>
      </div>

      <div className="w-full max-w-md rounded-3xl border-4 border-purple-300 bg-white p-5 shadow-xl">
        <h3 className="mb-4 text-center text-3xl font-extrabold">Scoreboard</h3>

        <div className="flex flex-col gap-3">
          {scoreboardPlayers.map((player, index) => (
            <div
              key={player.name}
              className={`flex items-center justify-between rounded-2xl px-4 py-3 font-bold ${
                index === 0
                  ? "border-2 border-yellow-400 bg-yellow-100 text-yellow-900"
                  : "bg-purple-100 text-purple-900"
              }`}
            >
              <div className="flex items-center gap-3">
                {player.avatar_url && (
                  <img
                    src={player.avatar_url}
                    alt={player.name}
                    className="h-10 w-10 rounded-full border-2 border-white object-cover"
                  />
                )}

                <span>
                  {index === 0 ? "👑 " : ""}
                  {player.name}
                </span>
              </div>

              <span>{player.points ?? 0}</span>
            </div>
          ))}
        </div>
      </div>

      {finalWinner && (
        <div className="max-w-4xl rounded-3xl border-4 border-yellow-400 bg-yellow-100 p-5 text-center shadow-xl">
          <h3 className="text-3xl font-extrabold">🎉 Final Winner</h3>
          <p className="mt-2 text-xl font-bold">{finalWinner}</p>

          <div className="mt-8">
            <h4 className="mb-4 text-2xl font-extrabold">🏆 Round History</h4>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {roundHistory.map((round) => (
                <div key={round.id} className="rounded-2xl bg-white p-3 text-black shadow">
                  <p className="mb-2 font-bold">Round {round.round_number}</p>

                  {round.winner_image_url && (
                    <img
                      src={round.winner_image_url}
                      alt={round.winner_prompt}
                      className="mb-2 w-full rounded-xl"
                    />
                  )}

                  <p className="font-bold">👑 {round.winner_name}</p>
                  <p className="text-sm text-gray-600">"{round.winner_prompt}"</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {finalWinner && isHost && (
        <button
          type="button"
          onClick={onPlayAgain}
          disabled={isPlayingAgain}
          className="rounded-2xl bg-green-600 px-8 py-4 font-extrabold text-white shadow-lg disabled:opacity-50"
        >
          {isPlayingAgain ? "Resetting Game..." : "Play Again"}
        </button>
      )}

      {finalWinner && !isHost && (
        <p className="text-center text-gray-500">
          Waiting for {hostName || "the host"} to start a rematch...
        </p>
      )}

      {!finalWinner && isHost && (
        <button
          onClick={onNextRound}
          disabled={isAdvancing}
          className="rounded-2xl bg-purple-600 px-8 py-4 font-extrabold text-white shadow-lg disabled:opacity-50"
        >
          {isAdvancing ? "Starting..." : "Next Round"}
        </button>
      )}

      {!finalWinner && !isHost && (
        <p className="text-center text-gray-500">
          Waiting for {hostName || "the host"} to start the next round...
        </p>
      )}
    </>
  );
}
