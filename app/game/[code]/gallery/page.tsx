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
    <main className="min-h-dvh bg-[#fff7ed] px-5 py-8 text-black">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="rounded-[2rem] border-2 border-black bg-white p-6 text-center shadow-[8px_8px_0_#111827]">
          <div className="flex items-center justify-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/mascot/mascot-sprite.png"
              alt=""
              aria-hidden="true"
              className="h-10 w-auto shrink-0"
            />
            <p className="text-xs font-black uppercase tracking-[0.25em] text-rose-700">
              Picture This Gallery
            </p>
          </div>
          <h1 className="mt-2 text-4xl font-black md:text-6xl">Room {code}</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm font-bold text-zinc-600 md:text-base">
            The winners, weirdest masterpieces, and receipts from this game night.
          </p>
          <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href={`/game/${code}`}
              className="rounded-2xl bg-rose-600 px-6 py-3 font-black text-white shadow-[4px_4px_0_#111827]"
            >
              Rejoin Room
            </Link>
            <Link
              href="/"
              className="rounded-2xl border-2 border-black bg-white px-6 py-3 font-black text-zinc-950 shadow-[4px_4px_0_#111827]"
            >
              Start New Game
            </Link>
          </div>
        </section>

        {topPlayer && (
          <section className="rounded-[2rem] border-2 border-black bg-amber-100 p-5 text-center shadow-[6px_6px_0_#111827]">
            <p className="text-xs font-black uppercase tracking-wider text-amber-800">Current leader</p>
            <div className="mt-3 flex items-center justify-center gap-3">
              {topPlayer.avatar_url && (
                <img
                  src={topPlayer.avatar_url}
                  alt={topPlayer.name}
                  loading="lazy"
                  decoding="async"
                  className="h-12 w-12 rounded-full border-2 border-black object-cover"
                />
              )}
              <p className="text-2xl font-black">
                {"\u{1F451}"} {topPlayer.name} &middot; {topPlayer.points} pts
              </p>
            </div>
          </section>
        )}

        {roundsError && (
          <section className="rounded-[2rem] border-2 border-black bg-white p-6 text-center text-rose-700 shadow-[6px_6px_0_#111827]">
            <h2 className="text-2xl font-black">Could not load gallery</h2>
            <p className="mt-2 text-sm font-bold">Try refreshing the page.</p>
          </section>
        )}

        {!roundsError && galleryRounds.length === 0 && (
          <section className="rounded-[2rem] border-2 border-black bg-white p-8 text-center shadow-[6px_6px_0_#111827]">
            <h2 className="text-3xl font-black">No winners yet</h2>
            <p className="mt-2 font-bold text-zinc-500">
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
                    className="overflow-hidden rounded-[1.7rem] border-2 border-black bg-white shadow-[6px_6px_0_#111827]"
                  >
                    {displayImage && (
                      <img
                        src={displayImage}
                        alt={round.winner_prompt}
                        loading="lazy"
                        decoding="async"
                        className="aspect-square w-full bg-rose-50 object-cover"
                      />
                    )}
                    <div className="p-4 text-center">
                      <p className="text-xs font-black uppercase tracking-wider text-rose-700">
                        Round {round.round_number}
                      </p>
                      <h3 className="mt-1 text-xl font-black">{"\u{1F451}"} {round.winner_name}</h3>
                      <p className="mt-3 text-sm font-bold leading-snug text-zinc-600">
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
