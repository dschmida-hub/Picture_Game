import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { toggleRoundHistoryVisibility } from "../actions";
import { SubmitButton } from "../SubmitButton";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type RoundHistoryRow = {
  id: number;
  room_code: string;
  round_number: number;
  winner_name: string | null;
  winner_prompt: string | null;
  winner_image_url: string | null;
  gallery_thumbnail_url: string | null;
  hidden_at: string | null;
};

type AdminShowcasePageProps = {
  searchParams: Promise<{
    key?: string;
    show?: string;
  }>;
};

function getAdminKey() {
  return process.env.ADMIN_KEY || process.env.ADMIN_REPORTS_KEY;
}

export default async function AdminShowcasePage({ searchParams }: AdminShowcasePageProps) {
  const { key, show = "all" } = await searchParams;
  const adminKey = getAdminKey();

  if (!adminKey || key !== adminKey) {
    return (
      <main className="min-h-screen bg-purple-50 p-6 text-black">
        <section className="mx-auto max-w-2xl rounded-3xl border border-red-200 bg-white p-6 text-center shadow-xl">
          <h1 className="text-3xl font-black">Not found</h1>
          <p className="mt-3 font-bold text-gray-600">That admin page is not available.</p>
        </section>
      </main>
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from("round_history")
    .select("*")
    .not("winner_image_url", "is", null)
    .order("id", { ascending: false })
    .limit(60);

  const migrationMissing = Boolean(
    error && /hidden_at/i.test(error.message || "") && /column/i.test(error.message || "")
  );

  const rows = (data || []) as RoundHistoryRow[];
  let visibleRows = rows;
  if (show === "visible") visibleRows = rows.filter((row) => !row.hidden_at);
  if (show === "hidden") visibleRows = rows.filter((row) => Boolean(row.hidden_at));

  const buildHref = (nextShow: string) => {
    const params = new URLSearchParams({ key });
    if (nextShow !== "all") params.set("show", nextShow);
    return `/admin/showcase?${params.toString()}`;
  };

  const filterPill = (active: boolean) =>
    `rounded-full px-3 py-1 text-sm font-black ${
      active ? "bg-purple-700 text-white" : "bg-white text-purple-800 border border-purple-200"
    }`;

  return (
    <main className="min-h-screen bg-purple-50 px-5 py-8 text-black">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="rounded-[2rem] border-4 border-black bg-white p-6 shadow-xl">
          <p className="text-xs font-extrabold uppercase tracking-[0.25em] text-purple-600">Admin</p>
          <h1 className="mt-2 text-4xl font-black">Homepage Showcase</h1>
          <p className="mt-2 font-bold text-gray-600">
            These are the most recent round winners. Anything not hidden can appear in the
            homepage&apos;s background collage, recent-winner demo card, and showcase gallery.
          </p>
          <Link
            href={`/admin?key=${encodeURIComponent(key)}`}
            className="mt-4 inline-flex font-black text-purple-700 underline"
          >
            Back to admin dashboard
          </Link>
        </section>

        {migrationMissing && (
          <section className="rounded-3xl border-2 border-red-300 bg-red-50 p-6 text-red-800 shadow-lg">
            <h2 className="text-2xl font-black">Migration not applied yet</h2>
            <p className="mt-2 text-sm font-bold">
              Run <code>supabase/round_history_moderation.sql</code> in the Supabase SQL Editor to
              add the <code>hidden_at</code> column, then reload this page.
            </p>
          </section>
        )}

        {error && !migrationMissing && (
          <section className="rounded-3xl border border-red-200 bg-white p-6 text-red-700 shadow-lg">
            <h2 className="text-2xl font-black">Could not load showcase entries</h2>
            <p className="mt-2 text-sm font-bold">{error.message}</p>
          </section>
        )}

        {!migrationMissing && (
          <section className="rounded-3xl border-4 border-black bg-white p-5 shadow-lg">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-gray-500">Show</span>
              {[
                ["all", `All (${rows.length})`],
                ["visible", `Visible (${rows.filter((row) => !row.hidden_at).length})`],
                ["hidden", `Hidden (${rows.filter((row) => Boolean(row.hidden_at)).length})`],
              ].map(([showOption, label]) => (
                <Link key={showOption} href={buildHref(showOption)} className={filterPill(show === showOption)}>
                  {label}
                </Link>
              ))}
            </div>
          </section>
        )}

        {!migrationMissing && (
          <section className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {visibleRows.map((row) => {
              const displayImage = row.gallery_thumbnail_url || row.winner_image_url;
              const isHidden = Boolean(row.hidden_at);

              return (
                <article
                  key={row.id}
                  className={`overflow-hidden rounded-3xl border-2 border-black bg-white shadow-lg ${
                    isHidden ? "opacity-60" : ""
                  }`}
                >
                  {displayImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={displayImage}
                      alt={row.winner_prompt || "Round winner"}
                      loading="lazy"
                      decoding="async"
                      className="aspect-square w-full bg-purple-100 object-cover"
                    />
                  )}
                  <div className="space-y-2 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {isHidden && (
                        <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-black uppercase text-white">
                          Hidden
                        </span>
                      )}
                      <Link
                        href={`/game/${row.room_code}`}
                        className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-purple-800 underline"
                      >
                        {row.room_code}
                      </Link>
                      <span className="text-xs font-bold text-gray-400">#{row.id}</span>
                    </div>
                    <p className="font-black">{row.winner_name || "Unknown winner"}</p>
                    <p className="text-sm font-bold text-gray-600">{row.winner_prompt}</p>

                    <form action={toggleRoundHistoryVisibility}>
                      <input type="hidden" name="key" value={key} />
                      <input type="hidden" name="entryId" value={row.id} />
                      <input type="hidden" name="hide" value={isHidden ? "false" : "true"} />
                      <SubmitButton
                        pendingText={isHidden ? "Unhiding..." : "Hiding..."}
                        className={`mt-2 w-full rounded-xl px-4 py-2 text-sm font-black text-white ${
                          isHidden ? "bg-green-600" : "bg-red-600"
                        }`}
                      >
                        {isHidden ? "Unhide from homepage" : "Hide from homepage"}
                      </SubmitButton>
                    </form>
                  </div>
                </article>
              );
            })}

            {visibleRows.length === 0 && !error && (
              <div className="rounded-3xl border border-purple-200 bg-white p-8 text-center shadow-lg md:col-span-2 lg:col-span-3">
                <h2 className="text-2xl font-black">No entries match this filter</h2>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
