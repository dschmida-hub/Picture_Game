import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { forceRoomToLobby, revealReadyImages } from "./actions";

export const dynamic = "force-dynamic";

type AdminPageProps = {
  searchParams: Promise<{
    key?: string;
    room?: string;
  }>;
};

type RecentGame = {
  id: number;
  room_code: string;
  created_at: string | null;
  stage: string | null;
  prompt: string | null;
  game_mode: string | null;
  image_style: string | null;
  estimated_image_cost_cents: number | string | null;
};

type PlayerRow = {
  room_code: string;
  name: string;
  is_host: boolean | null;
  points: number | null;
  avatar_url: string | null;
};

type SubmissionRow = {
  id: number;
  room_code: string;
  game_id: number | null;
  player_name: string;
  image_url: string | null;
  estimated_image_cost_cents: number | string | null;
  image_provider: string | null;
  image_model: string | null;
  created_at: string | null;
};

type CostSummary = {
  game_id: number;
  room_code: string;
  game_mode: string | null;
  image_style: string | null;
  game_estimated_image_cost_cents: number | string | null;
  generated_image_count: number | string | null;
  submission_estimated_image_cost_cents: number | string | null;
};

type ReportRow = {
  id: number;
  room_code: string;
  status: string;
  reported_player_name: string;
  created_at: string;
};

type GameEventRow = {
  id: number;
  city: string | null;
  country: string | null;
  created_at: string;
  event_name: string;
  game_id: number | null;
  player_name: string | null;
  region: string | null;
  room_code: string | null;
};

function getAdminKey() {
  return process.env.ADMIN_KEY || process.env.ADMIN_REPORTS_KEY;
}

function formatDate(value?: string | null) {
  if (!value) return "Unknown";

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatMoney(cents?: number | string | null) {
  const numericCents = Number(cents || 0);
  return `$${(numericCents / 100).toFixed(2)}`;
}

function roomKey(room?: string) {
  return (room || "").replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 12);
}

function AdminShell({
  children,
  title = "Admin",
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <main className="min-h-screen bg-[#fff7ed] px-5 py-8 text-black md:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="rounded-[2rem] border-4 border-black bg-white p-6 shadow-[8px_8px_0_#111827]">
          <p className="text-xs font-extrabold uppercase tracking-[0.25em] text-rose-700">
            Picture This control room
          </p>
          <h1 className="mt-2 text-4xl font-black">{title}</h1>
        </section>
        {children}
      </div>
    </main>
  );
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const { key, room } = await searchParams;
  const adminKey = getAdminKey();
  const selectedRoom = roomKey(room);

  if (!adminKey) {
    return (
      <AdminShell title="Admin is not configured">
        <section className="rounded-3xl border-2 border-orange-300 bg-white p-6 shadow-lg">
          <p className="font-bold text-zinc-700">
            Add <code>ADMIN_KEY</code> or <code>ADMIN_REPORTS_KEY</code> to your environment
            variables, then open this page with <code>?key=your-key</code>.
          </p>
        </section>
      </AdminShell>
    );
  }

  if (key !== adminKey) {
    return (
      <AdminShell title="Not found">
        <section className="rounded-3xl border-2 border-red-300 bg-white p-6 text-center shadow-lg">
          <p className="font-bold text-zinc-700">That admin page is not available.</p>
        </section>
      </AdminShell>
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const [
    recentGamesResult,
    activePlayersResult,
    recentSubmissionsResult,
    openReportsResult,
    costSummaryResult,
    gameEventsResult,
  ] = await Promise.all([
    supabase
      .from("games")
      .select(
        "id, room_code, created_at, stage, prompt, game_mode, image_style, estimated_image_cost_cents"
      )
      .order("id", { ascending: false })
      .limit(12),
    supabase
      .from("players")
      .select("room_code, name, is_host, points, avatar_url")
      .order("room_code", { ascending: true }),
    supabase
      .from("submissions")
      .select(
        "id, room_code, game_id, player_name, image_url, estimated_image_cost_cents, image_provider, image_model, created_at"
      )
      .order("id", { ascending: false })
      .limit(60),
    supabase
      .from("image_reports")
      .select("id, room_code, status, reported_player_name, created_at")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("game_cost_summary")
      .select(
        "game_id, room_code, game_mode, image_style, game_estimated_image_cost_cents, generated_image_count, submission_estimated_image_cost_cents"
      )
      .order("game_id", { ascending: false })
      .limit(10),
    supabase
      .from("game_events")
      .select("id, city, country, created_at, event_name, game_id, player_name, region, room_code")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const recentGames = (recentGamesResult.data || []) as RecentGame[];
  const activePlayers = (activePlayersResult.data || []) as PlayerRow[];
  const recentSubmissions = (recentSubmissionsResult.data || []) as SubmissionRow[];
  const openReports = (openReportsResult.data || []) as ReportRow[];
  const costSummary = (costSummaryResult.data || []) as CostSummary[];
  const gameEvents = (gameEventsResult.data || []) as GameEventRow[];

  const latestGameByRoom = new Map<string, RecentGame>();
  for (const game of recentGames) {
    if (!latestGameByRoom.has(game.room_code)) latestGameByRoom.set(game.room_code, game);
  }

  const playerCountByRoom = new Map<string, number>();
  for (const player of activePlayers) {
    playerCountByRoom.set(player.room_code, (playerCountByRoom.get(player.room_code) || 0) + 1);
  }

  const submissionStatsByRoom = new Map<string, { total: number; images: number; pending: number }>();
  for (const submission of recentSubmissions) {
    const stats = submissionStatsByRoom.get(submission.room_code) || {
      total: 0,
      images: 0,
      pending: 0,
    };
    stats.total += 1;
    if (submission.image_url) stats.images += 1;
    else stats.pending += 1;
    submissionStatsByRoom.set(submission.room_code, stats);
  }

  const stuckRooms = recentGames.filter((game) => {
    const stats = submissionStatsByRoom.get(game.room_code);
    return game.stage === "generating" || Boolean(stats?.pending);
  });

  const selectedPlayers = selectedRoom
    ? activePlayers.filter((player) => player.room_code === selectedRoom)
    : [];
  const selectedGames = selectedRoom
    ? recentGames.filter((game) => game.room_code === selectedRoom)
    : [];
  const selectedSubmissions = selectedRoom
    ? recentSubmissions.filter((submission) => submission.room_code === selectedRoom)
    : [];

  const totalGeneratedImages = recentSubmissions.filter((submission) => submission.image_url).length;
  const totalEstimatedCostCents = recentSubmissions.reduce(
    (sum, submission) => sum + Number(submission.estimated_image_cost_cents || 0),
    0
  );

  const eventCountByName = new Map<string, number>();
  const eventCountByLocation = new Map<string, number>();
  for (const event of gameEvents) {
    eventCountByName.set(event.event_name, (eventCountByName.get(event.event_name) || 0) + 1);
    const locationLabel = [event.city, event.region, event.country].filter(Boolean).join(", ") || "Unknown";
    eventCountByLocation.set(locationLabel, (eventCountByLocation.get(locationLabel) || 0) + 1);
  }

  const topEvents = Array.from(eventCountByName.entries())
    .sort((first, second) => second[1] - first[1])
    .slice(0, 8);
  const topLocations = Array.from(eventCountByLocation.entries())
    .sort((first, second) => second[1] - first[1])
    .slice(0, 8);

  const roomLinkSuffix = `?key=${encodeURIComponent(key)}`;

  return (
    <AdminShell title="Admin Dashboard">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <MetricCard label="Recent rooms" value={String(latestGameByRoom.size)} />
        <MetricCard label="Players tracked" value={String(activePlayers.length)} />
        <MetricCard label="Recent images" value={String(totalGeneratedImages)} />
        <MetricCard label="Recent image cost" value={formatMoney(totalEstimatedCostCents)} />
      </section>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-[0.75fr_1.25fr]">
        <div className="rounded-3xl border-4 border-black bg-white p-5 shadow-[6px_6px_0_#111827]">
          <h2 className="text-2xl font-black">Room lookup</h2>
          <form className="mt-4 flex flex-col gap-3" action="/admin">
            <input type="hidden" name="key" value={key} />
            <label className="text-sm font-black text-rose-700" htmlFor="room">
              Room code
            </label>
            <input
              id="room"
              name="room"
              defaultValue={selectedRoom}
              placeholder="ABCDE"
              className="rounded-2xl border-2 border-black bg-white p-4 text-xl font-black uppercase tracking-[0.25em] shadow-[3px_3px_0_#111827]"
            />
            <button className="rounded-2xl bg-zinc-950 px-5 py-4 font-black text-white shadow-[4px_4px_0_#fb7185]">
              Inspect Room
            </button>
          </form>

          <div className="mt-5 flex flex-wrap gap-3 text-sm font-black">
            <Link className="underline" href={`/admin/reports${roomLinkSuffix}`}>
              Image reports
            </Link>
            <Link className="underline" href={`/${roomLinkSuffix}`}>
              Home
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border-4 border-black bg-white p-5 shadow-[6px_6px_0_#111827]">
          <h2 className="text-2xl font-black">
            {selectedRoom ? `Room ${selectedRoom}` : "Quick health check"}
          </h2>
          {selectedRoom ? (
            <>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                <MiniPanel title="Games" value={String(selectedGames.length)} />
                <MiniPanel title="Players" value={String(selectedPlayers.length)} />
                <MiniPanel title="Submissions" value={String(selectedSubmissions.length)} />
              </div>
              <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                <form action={revealReadyImages}>
                  <input type="hidden" name="key" value={key} />
                  <input type="hidden" name="roomCode" value={selectedRoom} />
                  <button
                    type="submit"
                    className="w-full rounded-2xl border-2 border-black bg-orange-100 px-5 py-4 font-black text-orange-900 shadow-[4px_4px_0_#111827]"
                  >
                    Reveal Ready Images
                  </button>
                </form>
                <form action={forceRoomToLobby}>
                  <input type="hidden" name="key" value={key} />
                  <input type="hidden" name="roomCode" value={selectedRoom} />
                  <button
                    type="submit"
                    className="w-full rounded-2xl border-2 border-black bg-rose-100 px-5 py-4 font-black text-rose-900 shadow-[4px_4px_0_#111827]"
                  >
                    Force Back to Lobby
                  </button>
                </form>
              </div>
              <p className="mt-3 text-xs font-bold text-zinc-500">
                Admin actions update the latest game row for this room and do not delete submissions.
              </p>
            </>
          ) : (
            <p className="mt-3 font-bold text-zinc-600">
              Lookup a room when someone says “it’s stuck” and you’ll see the players,
              submissions, costs, and useful links in one place.
            </p>
          )}
        </div>
      </section>

      {selectedRoom && (
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <AdminCard title="Players">
            {selectedPlayers.length ? (
              <div className="space-y-3">
                {selectedPlayers.map((player) => (
                  <div
                    key={`${player.room_code}-${player.name}`}
                    className="rounded-2xl border border-zinc-200 bg-rose-50 p-3"
                  >
                    <p className="font-black">
                      {player.name} {player.is_host ? "· Host" : ""}
                    </p>
                    <p className="text-sm font-bold text-zinc-600">{player.points || 0} points</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyText>No players found for this room in the latest data.</EmptyText>
            )}
          </AdminCard>

          <AdminCard title="Submissions">
            {selectedSubmissions.length ? (
              <div className="space-y-3">
                {selectedSubmissions.slice(0, 10).map((submission) => (
                  <div key={submission.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-black">{submission.player_name}</p>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-black">
                        {submission.image_url ? "image ready" : "pending"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-bold text-zinc-600">
                      {formatMoney(submission.estimated_image_cost_cents)} ·{" "}
                      {submission.image_model || "unknown model"}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyText>No submissions found for this room in the latest data.</EmptyText>
            )}
          </AdminCard>
        </section>
      )}

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <AdminCard title="Recent rooms">
          <div className="space-y-3">
            {recentGames.map((game) => {
              const stats = submissionStatsByRoom.get(game.room_code);
              return (
                <div key={game.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link
                      href={`/admin?key=${encodeURIComponent(key)}&room=${game.room_code}`}
                      className="text-xl font-black text-rose-700 underline"
                    >
                      {game.room_code}
                    </Link>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black">
                      {game.stage || "unknown"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-bold text-zinc-600">{formatDate(game.created_at)}</p>
                  <p className="mt-2 line-clamp-2 text-sm font-bold">{game.prompt || "No prompt"}</p>
                  <p className="mt-2 text-xs font-black uppercase tracking-wider text-zinc-500">
                    {playerCountByRoom.get(game.room_code) || 0} players · {stats?.images || 0} images ·{" "}
                    {formatMoney(game.estimated_image_cost_cents)}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3 text-sm font-black">
                    <Link href={`/game/${game.room_code}`} className="underline">
                      Open game
                    </Link>
                    <Link href={`/game/${game.room_code}/gallery`} className="underline">
                      Gallery
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </AdminCard>

        <AdminCard title="Needs attention">
          {stuckRooms.length || openReports.length ? (
            <div className="space-y-4">
              {stuckRooms.slice(0, 8).map((game) => {
                const stats = submissionStatsByRoom.get(game.room_code);
                return (
                  <div key={`stuck-${game.id}`} className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
                    <p className="font-black">{game.room_code}</p>
                    <p className="text-sm font-bold text-orange-800">
                      Stage: {game.stage || "unknown"} · Pending images: {stats?.pending || 0}
                    </p>
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <form action={revealReadyImages}>
                        <input type="hidden" name="key" value={key} />
                        <input type="hidden" name="roomCode" value={game.room_code} />
                        <button className="w-full rounded-xl bg-orange-200 px-3 py-2 text-sm font-black text-orange-950">
                          Reveal
                        </button>
                      </form>
                      <form action={forceRoomToLobby}>
                        <input type="hidden" name="key" value={key} />
                        <input type="hidden" name="roomCode" value={game.room_code} />
                        <button className="w-full rounded-xl bg-white px-3 py-2 text-sm font-black text-orange-950">
                          Lobby
                        </button>
                      </form>
                    </div>
                  </div>
                );
              })}
              {openReports.map((report) => (
                <div key={`report-${report.id}`} className="rounded-2xl border border-red-200 bg-red-50 p-4">
                  <p className="font-black">
                    Report #{report.id} · {report.room_code}
                  </p>
                  <p className="text-sm font-bold text-red-800">
                    Reported player: {report.reported_player_name}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyText>No stuck recent rooms or open reports found. Rare clean-control-room energy.</EmptyText>
          )}
        </AdminCard>
      </section>

      <AdminCard title="Recent cost summary">
        {costSummaryResult.error ? (
          <EmptyText>Could not load game_cost_summary: {costSummaryResult.error.message}</EmptyText>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b-2 border-black">
                  <th className="p-3">Room</th>
                  <th className="p-3">Mode</th>
                  <th className="p-3">Style</th>
                  <th className="p-3">Images</th>
                  <th className="p-3">Submission cost</th>
                  <th className="p-3">Game cost</th>
                </tr>
              </thead>
              <tbody>
                {costSummary.map((row) => (
                  <tr key={row.game_id} className="border-b border-zinc-200">
                    <td className="p-3 font-black">{row.room_code}</td>
                    <td className="p-3 font-bold">{row.game_mode || "unknown"}</td>
                    <td className="p-3 font-bold">{row.image_style || "unknown"}</td>
                    <td className="p-3 font-bold">{row.generated_image_count || 0}</td>
                    <td className="p-3 font-bold">
                      {formatMoney(row.submission_estimated_image_cost_cents)}
                    </td>
                    <td className="p-3 font-bold">
                      {formatMoney(row.game_estimated_image_cost_cents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <AdminCard title="Analytics: top events">
          {gameEventsResult.error ? (
            <EmptyText>Could not load game_events: {gameEventsResult.error.message}</EmptyText>
          ) : topEvents.length ? (
            <div className="space-y-3">
              {topEvents.map(([eventName, count]) => (
                <div
                  key={eventName}
                  className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
                >
                  <p className="font-black">{eventName}</p>
                  <p className="rounded-full bg-white px-3 py-1 text-sm font-black">{count}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyText>No game events logged yet. Run the SQL script, then play a test room.</EmptyText>
          )}
        </AdminCard>

        <AdminCard title="Analytics: where people played">
          {topLocations.length ? (
            <div className="space-y-3">
              {topLocations.map(([location, count]) => (
                <div
                  key={location}
                  className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-rose-50 p-4"
                >
                  <p className="font-black">{location}</p>
                  <p className="rounded-full bg-white px-3 py-1 text-sm font-black">{count}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyText>Location data appears when Vercel sends geo headers for logged events.</EmptyText>
          )}
        </AdminCard>
      </section>

      <AdminCard title="Recent analytics events">
        {gameEvents.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b-2 border-black">
                  <th className="p-3">Time</th>
                  <th className="p-3">Event</th>
                  <th className="p-3">Room</th>
                  <th className="p-3">Player</th>
                  <th className="p-3">Location</th>
                </tr>
              </thead>
              <tbody>
                {gameEvents.slice(0, 25).map((event) => (
                  <tr key={event.id} className="border-b border-zinc-200">
                    <td className="p-3 font-bold">{formatDate(event.created_at)}</td>
                    <td className="p-3 font-black">{event.event_name}</td>
                    <td className="p-3 font-bold">{event.room_code || "—"}</td>
                    <td className="p-3 font-bold">{event.player_name || "—"}</td>
                    <td className="p-3 font-bold">
                      {[event.city, event.region, event.country].filter(Boolean).join(", ") || "Unknown"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyText>No recent analytics events yet.</EmptyText>
        )}
      </AdminCard>
    </AdminShell>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border-4 border-black bg-white p-5 shadow-[5px_5px_0_#111827]">
      <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-rose-700">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
  );
}

function MiniPanel({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border-2 border-black bg-rose-50 p-4">
      <p className="text-xs font-black uppercase tracking-wider text-rose-700">{title}</p>
      <p className="mt-1 text-3xl font-black">{value}</p>
    </div>
  );
}

function AdminCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border-4 border-black bg-white p-5 shadow-[6px_6px_0_#111827]">
      <h2 className="text-2xl font-black">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function EmptyText({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl bg-zinc-50 p-4 font-bold text-zinc-600">{children}</p>;
}
