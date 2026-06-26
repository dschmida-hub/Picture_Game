type HostDebugStats = {
  estimatedCostCents: number;
  generatedImages: number;
  imageModel: string | null;
  imageProvider: string | null;
  reportCount: number | null;
};

type HostDebugPanelProps = {
  currentGameId: number | null;
  playersCount: number;
  stage: string;
  submissionsCount: number;
  votesCount: number;
  stats: HostDebugStats;
};

function formatEstimatedCost(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function HostDebugPanel({
  currentGameId,
  playersCount,
  stage,
  submissionsCount,
  votesCount,
  stats,
}: HostDebugPanelProps) {
  const modelLabel = [stats.imageProvider, stats.imageModel].filter(Boolean).join(" / ") || "No images yet";

  return (
    <details className="w-full max-w-6xl rounded-2xl border border-purple-200 bg-white/90 p-3 text-left shadow-sm">
      <summary className="cursor-pointer select-none text-sm font-extrabold text-purple-700">
        Host debug · {formatEstimatedCost(stats.estimatedCostCents)} · {stats.generatedImages} image
        {stats.generatedImages === 1 ? "" : "s"}
      </summary>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold text-gray-600 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl bg-purple-50 p-3">
          <p className="text-[0.65rem] uppercase tracking-wider text-purple-500">Game ID</p>
          <p className="mt-1 text-sm text-black">{currentGameId || "None"}</p>
        </div>
        <div className="rounded-xl bg-purple-50 p-3">
          <p className="text-[0.65rem] uppercase tracking-wider text-purple-500">Stage</p>
          <p className="mt-1 text-sm text-black">{stage}</p>
        </div>
        <div className="rounded-xl bg-purple-50 p-3">
          <p className="text-[0.65rem] uppercase tracking-wider text-purple-500">Players</p>
          <p className="mt-1 text-sm text-black">{playersCount}</p>
        </div>
        <div className="rounded-xl bg-purple-50 p-3">
          <p className="text-[0.65rem] uppercase tracking-wider text-purple-500">Submissions</p>
          <p className="mt-1 text-sm text-black">{submissionsCount}</p>
        </div>
        <div className="rounded-xl bg-purple-50 p-3">
          <p className="text-[0.65rem] uppercase tracking-wider text-purple-500">Votes</p>
          <p className="mt-1 text-sm text-black">{votesCount}</p>
        </div>
        <div className="rounded-xl bg-purple-50 p-3">
          <p className="text-[0.65rem] uppercase tracking-wider text-purple-500">Reports</p>
          <p className="mt-1 text-sm text-black">{stats.reportCount ?? "—"}</p>
        </div>
      </div>

      <p className="mt-3 rounded-xl bg-gray-50 p-3 text-xs font-bold text-gray-600">
        Model: <span className="text-gray-950">{modelLabel}</span>
      </p>
    </details>
  );
}
