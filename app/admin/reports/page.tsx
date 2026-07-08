import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { updateReportStatus } from "../actions";
import { SubmitButton } from "../SubmitButton";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type AdminReportsPageProps = {
  searchParams: Promise<{
    key?: string;
  }>;
};

type ImageReport = {
  id: number;
  created_at: string;
  room_code: string;
  game_id: number;
  submission_id: number;
  reporter_name: string;
  reported_player_name: string;
  status: string;
  round_prompt: string | null;
  submission_text: string | null;
};

type SubmissionPreview = {
  id: number;
  image_url: string | null;
  gallery_thumbnail_url: string | null;
  image_caption: string | null;
};

function getAdminKey() {
  return process.env.ADMIN_KEY || process.env.ADMIN_REPORTS_KEY;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function AdminReportsPage({ searchParams }: AdminReportsPageProps) {
  const { key } = await searchParams;
  const adminKey = getAdminKey();

  if (!adminKey) {
    return (
      <main className="min-h-screen bg-purple-50 p-6 text-black">
        <section className="mx-auto max-w-2xl rounded-3xl border border-orange-200 bg-white p-6 shadow-xl">
          <h1 className="text-3xl font-black">Reports admin is not configured</h1>
          <p className="mt-3 font-bold text-gray-600">
            Add <code>ADMIN_KEY</code> or <code>ADMIN_REPORTS_KEY</code> to your environment
            variables, then open this page with <code> ?key=your-key</code>.
          </p>
        </section>
      </main>
    );
  }

  if (key !== adminKey) {
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

  const { data: reports, error: reportsError } = await supabase
    .from("image_reports")
    .select(
      "id, created_at, room_code, game_id, submission_id, reporter_name, reported_player_name, status, round_prompt, submission_text"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const reportRows = (reports || []) as ImageReport[];
  const submissionIds = Array.from(new Set(reportRows.map((report) => report.submission_id)));

  const { data: submissions } = submissionIds.length
    ? await supabase
        .from("submissions")
        .select("id, image_url, gallery_thumbnail_url, image_caption")
        .in("id", submissionIds)
    : { data: [] };

  const submissionsById = new Map<number, SubmissionPreview>(
    ((submissions || []) as SubmissionPreview[]).map((submission) => [submission.id, submission])
  );

  return (
    <main className="min-h-screen bg-purple-50 px-5 py-8 text-black">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="rounded-[2rem] border-4 border-black bg-white p-6 shadow-xl">
          <p className="text-xs font-extrabold uppercase tracking-[0.25em] text-purple-600">
            Admin
          </p>
          <h1 className="mt-2 text-4xl font-black">Image Reports</h1>
          <p className="mt-2 font-bold text-gray-600">
            Review reported prompts/images and mark each report once handled.
          </p>
          <Link
            href={`/admin?key=${encodeURIComponent(key)}`}
            className="mt-4 inline-flex font-black text-purple-700 underline"
          >
            Back to admin dashboard
          </Link>
        </section>

        {reportsError && (
          <section className="rounded-3xl border border-red-200 bg-white p-6 text-red-700 shadow-lg">
            <h2 className="text-2xl font-black">Could not load reports</h2>
            <p className="mt-2 text-sm font-bold">{reportsError.message}</p>
          </section>
        )}

        {!reportsError && reportRows.length === 0 && (
          <section className="rounded-3xl border border-purple-200 bg-white p-8 text-center shadow-lg">
            <h2 className="text-3xl font-black">No reports yet</h2>
            <p className="mt-2 font-bold text-gray-500">A blessedly quiet moderation desk.</p>
          </section>
        )}

        <section className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {reportRows.map((report) => {
            const submission = submissionsById.get(report.submission_id);
            const displayImage = submission?.gallery_thumbnail_url || submission?.image_url;

            return (
              <article
                key={report.id}
                className="overflow-hidden rounded-3xl border border-purple-200 bg-white shadow-lg"
              >
                {displayImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={displayImage}
                    alt={submission?.image_caption || "Reported image"}
                    loading="lazy"
                    decoding="async"
                    className="aspect-square w-full bg-purple-100 object-cover"
                  />
                )}
                <div className="space-y-3 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-orange-700">
                      {report.status}
                    </span>
                    <span className="text-xs font-bold text-gray-500">
                      {formatDate(report.created_at)}
                    </span>
                  </div>

                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-wider text-purple-600">
                      Reported player
                    </p>
                    <p className="font-black">{report.reported_player_name}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl bg-gray-50 p-3">
                      <p className="text-xs font-extrabold uppercase text-gray-500">Reporter</p>
                      <p className="font-bold">{report.reporter_name}</p>
                    </div>
                    <div className="rounded-2xl bg-gray-50 p-3">
                      <p className="text-xs font-extrabold uppercase text-gray-500">Room</p>
                      <Link
                        href={`/game/${report.room_code}`}
                        className="font-bold text-purple-700 underline"
                      >
                        {report.room_code}
                      </Link>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-purple-50 p-3">
                    <p className="text-xs font-extrabold uppercase text-purple-600">
                      Round prompt
                    </p>
                    <p className="mt-1 text-sm font-bold text-gray-700">
                      {report.round_prompt || "Unknown"}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-gray-950 p-3 text-white">
                    <p className="text-xs font-extrabold uppercase text-purple-200">
                      Player answer
                    </p>
                    <p className="mt-1 font-bold">{report.submission_text || "Unknown"}</p>
                  </div>

                  <p className="text-xs font-bold text-gray-500">
                    Report #{report.id} · Game {report.game_id} · Submission {report.submission_id}
                  </p>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {(["reviewed", "dismissed", "removed"] as const).map((status) => (
                      <form key={status} action={updateReportStatus}>
                        <input type="hidden" name="key" value={key} />
                        <input type="hidden" name="reportId" value={report.id} />
                        <input type="hidden" name="status" value={status} />
                        <SubmitButton
                          pendingText="Saving..."
                          className="w-full rounded-xl bg-purple-100 px-3 py-2 text-sm font-black capitalize text-purple-900"
                        >
                          {status}
                        </SubmitButton>
                      </form>
                    ))}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
