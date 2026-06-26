import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

type GalleryPageProps = {
  params: Promise<{
    code: string;
  }>;
};

type GalleryRound = {
  id: number;
  round_number: number;
  winner_name: string;
  winner_prompt: string;
  winner_image_url: string | null;
  gallery_thumbnail_url: string | null;
};

type GalleryPlayer = {
  name: string;
  points: number;
  avatar_url: string | null;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function normalizeRoomCode(code: string) {
  return code.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 12);
}

export default async function GameGalleryPage({ params }: GalleryPageProps) {
  const { code: rawCode } = await params;
  const code = normalizeRoomCode(rawCode);

  const [{ data: rounds, error: roundsError }, { data: players }] = await Promise.all([
    supabase
      .from("round_history")
      .select("id, round_number, winner_name, winner_prompt, winner_image_url, gallery_thumbnail_url")
      .eq("room_code", code)
      .order("round_number", { ascending: true }),
    supabase
      .from("players")
      .select("name, points, avatar_url")
      .eq("room_code", code)
      .order("points", { ascending: false }),
  ]);

  const galleryRounds = (rounds || []) as GalleryRound[];
  const scoreboardPlayers = (players || []) as GalleryPlayer[];
  const topPlayer = scoreboardPlayers[0];

  return (
    <main className="min-h-screen bg-purple-50 px-5 py-8 text-black">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <section className="rounded-[2rem] border-4 border-black bg-white p-6 text-center shadow-xl">
          <p className="text-xs font-extrabold uppercase tracking-[0.25em] text-purple-600">
            Picture This Gallery
          </p>
          <h1 className="mt-2 text-4xl font-black md:text-6xl">Room {code}</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm font-bold text-gray-600 md:text-base">
            The winners, weirdest masterpieces, and receipts from this game night.
          </p>
          <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href={`/game/${code}`}
              className="rounded-2xl bg-purple-600 px-6 py-3 font-extrabold text-white"
            >
              Rejoin Room
            </Link>
            <Link
              href="/"
              className="rounded-2xl border border-purple-200 bg-purple-50 px-6 py-3 font-extrabold text-purple-700"
            >
              Start New Game
            </Link>
          </div>
        </section>

        {topPlayer && (
          <section className="rounded-3xl border border-yellow-300 bg-yellow-100 p-5 text-center shadow-lg">
            <p className="text-xs font-extrabold uppercase tracking-wider text-yellow-700">Current leader</p>
            <div className="mt-3 flex items-center justify-center gap-3">
              {topPlayer.avatar_url && (
                <img
                  src={topPlayer.avatar_url}
                  alt={topPlayer.name}
                  loading="lazy"
                  decoding="async"
                  className="h-12 w-12 rounded-full border-2 border-white object-cover"
                />
              )}
              <p className="text-2xl font-black">
                👑 {topPlayer.name} · {topPlayer.points} pts
              </p>
            </div>
          </section>
        )}

        {roundsError && (
          <section className="rounded-3xl border border-red-200 bg-white p-6 text-center text-red-700 shadow-lg">
            <h2 className="text-2xl font-black">Could not load gallery</h2>
            <p className="mt-2 text-sm font-bold">Try refreshing the page.</p>
          </section>
        )}

        {!roundsError && galleryRounds.length === 0 && (
          <section className="rounded-3xl border border-purple-200 bg-white p-8 text-center shadow-lg">
            <h2 className="text-3xl font-black">No winners yet</h2>
            <p className="mt-2 font-bold text-gray-500">
              Finish a round, then this page will become the recap gallery.
            </p>
          </section>
        )}

        {galleryRounds.length > 0 && (
          <section>
            <h2 className="mb-4 text-center text-3xl font-black">Round Winners</h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {galleryRounds.map((round) => {
                const displayImage = round.gallery_thumbnail_url || round.winner_image_url;

                return (
                  <article
                    key={round.id}
                    className="overflow-hidden rounded-3xl border border-purple-200 bg-white shadow-lg"
                  >
                    {displayImage && (
                      <img
                        src={displayImage}
                        alt={round.winner_prompt}
                        loading="lazy"
                        decoding="async"
                        className="aspect-square w-full bg-purple-100 object-cover"
                      />
                    )}
                    <div className="p-4 text-center">
                      <p className="text-xs font-extrabold uppercase tracking-wider text-purple-600">
                        Round {round.round_number}
                      </p>
                      <h3 className="mt-1 text-xl font-black">👑 {round.winner_name}</h3>
                      <p className="mt-3 text-sm font-bold leading-snug text-gray-600">
                        {`"${round.winner_prompt}"`}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
