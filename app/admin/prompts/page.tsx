import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { setPromptRating, togglePromptActive } from "../actions";
import { SubmitButton } from "../SubmitButton";
import { adminLoginUrl, getAdminKey, hasAdminSession, isValidAdminKey } from "../auth";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type PromptRow = {
  id: number;
  prompt: string;
  category: string | null;
  active: boolean;
  image_style: string | null;
  prompt_rating: string | null;
};

type AdminPromptsPageProps = {
  searchParams: Promise<{
    key?: string;
    table?: string;
    rating?: string;
    show?: string;
  }>;
};

const TABLE_LABELS: Record<string, string> = {
  prompts: "Classic",
  cah_prompts: "Fill in the Blank",
  most_likely_to_prompts: "Most Likely To",
};

const PROMPT_TABLES = ["prompts", "cah_prompts", "most_likely_to_prompts"] as const;
type PromptTable = (typeof PROMPT_TABLES)[number];

const RATING_STYLES: Record<string, string> = {
  good: "bg-green-100 text-green-800",
  ehhh: "bg-yellow-100 text-yellow-800",
  bad: "bg-red-100 text-red-700",
  unrated: "bg-gray-100 text-gray-600",
};

export default async function AdminPromptsPage({ searchParams }: AdminPromptsPageProps) {
  const { key, table: tableParam, rating = "all", show = "all" } = await searchParams;
  const adminKey = getAdminKey();

  if (!adminKey) {
    return (
      <main className="min-h-screen bg-purple-50 p-6 text-black">
        <section className="mx-auto max-w-2xl rounded-3xl border border-red-200 bg-white p-6 text-center shadow-xl">
          <h1 className="text-3xl font-black">Not found</h1>
          <p className="mt-3 font-bold text-gray-600">That admin page is not available.</p>
        </section>
      </main>
    );
  }

  if (!(await hasAdminSession())) {
    if (isValidAdminKey(key)) {
      redirect(adminLoginUrl(key!, "/admin/prompts"));
    }

    return (
      <main className="min-h-screen bg-purple-50 p-6 text-black">
        <section className="mx-auto max-w-2xl rounded-3xl border border-red-200 bg-white p-6 text-center shadow-xl">
          <h1 className="text-3xl font-black">Not found</h1>
          <p className="mt-3 font-bold text-gray-600">That admin page is not available.</p>
        </section>
      </main>
    );
  }

  const table: PromptTable = PROMPT_TABLES.includes(tableParam as PromptTable)
    ? (tableParam as PromptTable)
    : "prompts";

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from(table)
    .select("id, prompt, category, active, image_style, prompt_rating")
    .order("id", { ascending: true })
    .limit(2000);

  const rows = (data || []) as PromptRow[];

  const counts = {
    total: rows.length,
    good: rows.filter((row) => row.prompt_rating === "good").length,
    ehhh: rows.filter((row) => row.prompt_rating === "ehhh").length,
    bad: rows.filter((row) => row.prompt_rating === "bad").length,
    unrated: rows.filter((row) => !row.prompt_rating).length,
    active: rows.filter((row) => row.active).length,
    inactive: rows.filter((row) => !row.active).length,
  };

  let visibleRows = rows;
  if (rating !== "all") {
    visibleRows = visibleRows.filter((row) =>
      rating === "unrated" ? !row.prompt_rating : row.prompt_rating === rating
    );
  }
  if (show === "active") visibleRows = visibleRows.filter((row) => row.active);
  if (show === "inactive") visibleRows = visibleRows.filter((row) => !row.active);

  const buildHref = (next: { table?: string; rating?: string; show?: string }) => {
    const params = new URLSearchParams();
    params.set("table", next.table ?? table);
    const nextRating = next.rating ?? rating;
    const nextShow = next.show ?? show;
    if (nextRating !== "all") params.set("rating", nextRating);
    if (nextShow !== "all") params.set("show", nextShow);
    return `/admin/prompts?${params.toString()}`;
  };

  const filterPill = (active: boolean) =>
    `rounded-full px-3 py-1 text-sm font-black ${
      active ? "bg-purple-700 text-white" : "bg-white text-purple-800 border border-purple-200"
    }`;

  return (
    <main className="min-h-screen bg-purple-50 px-5 py-8 text-black">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <section className="rounded-[2rem] border-4 border-black bg-white p-6 shadow-xl">
          <p className="text-xs font-extrabold uppercase tracking-[0.25em] text-purple-600">Admin</p>
          <h1 className="mt-2 text-4xl font-black">Manage Prompts</h1>
          <p className="mt-2 font-bold text-gray-600">
            Deactivating a prompt removes it from the game entirely. Rating only affects how often a
            prompt is picked (&quot;bad&quot; is used last).
          </p>
          <Link href="/admin" className="mt-4 inline-flex font-black text-purple-700 underline">
            Back to admin dashboard
          </Link>
        </section>

        <section className="rounded-3xl border-4 border-black bg-white p-5 shadow-lg">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-gray-500">Deck</span>
            {PROMPT_TABLES.map((tableOption) => (
              <Link
                key={tableOption}
                href={buildHref({ table: tableOption, rating: "all", show: "all" })}
                className={filterPill(table === tableOption)}
              >
                {TABLE_LABELS[tableOption]}
              </Link>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-gray-500">Rating</span>
            {["all", "good", "ehhh", "bad", "unrated"].map((ratingOption) => (
              <Link
                key={ratingOption}
                href={buildHref({ rating: ratingOption })}
                className={filterPill(rating === ratingOption)}
              >
                {ratingOption === "all" ? "All" : ratingOption}
                {ratingOption !== "all" && (
                  <span className="ml-1 opacity-70">
                    {counts[ratingOption as "good" | "ehhh" | "bad" | "unrated"]}
                  </span>
                )}
              </Link>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-gray-500">Status</span>
            {[
              ["all", `All (${counts.total})`],
              ["active", `Active (${counts.active})`],
              ["inactive", `Inactive (${counts.inactive})`],
            ].map(([showOption, label]) => (
              <Link
                key={showOption}
                href={buildHref({ show: showOption })}
                className={filterPill(show === showOption)}
              >
                {label}
              </Link>
            ))}
          </div>
        </section>

        {error && (
          <section className="rounded-3xl border border-red-200 bg-white p-6 text-red-700 shadow-lg">
            <h2 className="text-2xl font-black">Could not load prompts</h2>
            <p className="mt-2 text-sm font-bold">{error.message}</p>
          </section>
        )}

        <p className="text-sm font-black text-gray-600">
          Showing {visibleRows.length} of {counts.total} {TABLE_LABELS[table]} prompts
        </p>

        <section className="flex flex-col gap-3">
          {visibleRows.map((row) => {
            const ratingKey = row.prompt_rating || "unrated";

            return (
              <article
                key={row.id}
                className={`rounded-3xl border-2 border-black bg-white p-4 shadow-[4px_4px_0_#111827] ${
                  row.active ? "" : "opacity-60"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black uppercase ${RATING_STYLES[ratingKey]}`}
                  >
                    {ratingKey}
                  </span>
                  {row.category && (
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">
                      {row.category}
                    </span>
                  )}
                  {!row.active && (
                    <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-black uppercase text-white">
                      Inactive
                    </span>
                  )}
                  <span className="ml-auto text-xs font-bold text-gray-400">#{row.id}</span>
                </div>

                <p className="mt-3 text-lg font-black">{row.prompt}</p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <form action={togglePromptActive}>
                    <input type="hidden" name="table" value={table} />
                    <input type="hidden" name="promptId" value={row.id} />
                    <input type="hidden" name="active" value={row.active ? "false" : "true"} />
                    <input type="hidden" name="filterRating" value={rating} />
                    <input type="hidden" name="filterShow" value={show} />
                    <SubmitButton
                      pendingText={row.active ? "Deactivating..." : "Reactivating..."}
                      className={`rounded-xl px-4 py-2 text-sm font-black text-white ${
                        row.active ? "bg-red-600" : "bg-green-600"
                      }`}
                    >
                      {row.active ? "Deactivate" : "Reactivate"}
                    </SubmitButton>
                  </form>

                  <span className="text-xs font-black uppercase tracking-wider text-gray-400">
                    Rate
                  </span>
                  {(["good", "ehhh", "bad"] as const).map((ratingOption) => (
                    <form key={ratingOption} action={setPromptRating}>
                      <input type="hidden" name="table" value={table} />
                      <input type="hidden" name="promptId" value={row.id} />
                      <input type="hidden" name="rating" value={ratingOption} />
                      <input type="hidden" name="filterRating" value={rating} />
                      <input type="hidden" name="filterShow" value={show} />
                      <SubmitButton
                        disabled={row.prompt_rating === ratingOption}
                        pendingText="Rating..."
                        className={`rounded-xl px-3 py-2 text-sm font-black capitalize ${
                          row.prompt_rating === ratingOption
                            ? "cursor-default bg-gray-200 text-gray-500"
                            : "bg-purple-100 text-purple-900"
                        }`}
                      >
                        {ratingOption}
                      </SubmitButton>
                    </form>
                  ))}
                </div>
              </article>
            );
          })}

          {visibleRows.length === 0 && !error && (
            <div className="rounded-3xl border border-purple-200 bg-white p-8 text-center shadow-lg">
              <h2 className="text-2xl font-black">No prompts match this filter</h2>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
