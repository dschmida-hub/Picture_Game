import Link from "next/link";

const steps = [
  {
    number: "1",
    title: "Create or join a room",
    description:
      "One player starts a room, shares the code, and everyone joins from their own phone.",
  },
  {
    number: "2",
    title: "Answer the prompt",
    description:
      "Write a short answer that gives the AI something weird, specific, and funny to draw.",
  },
  {
    number: "3",
    title: "Watch the chaos cook",
    description:
      "The game turns everyone’s answers into anonymous images while the room waits together.",
  },
  {
    number: "4",
    title: "Vote for the funniest image",
    description:
      "Players vote on the images without knowing who wrote what. The winner gets the points.",
  },
];

export default function HowToPlayPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fff7ed] px-5 py-8 text-black md:px-8 md:py-12">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[#fff7ed]" />
        <div className="absolute -left-20 top-24 h-72 w-72 rounded-full bg-rose-100/80 blur-2xl" />
        <div className="absolute -right-24 bottom-10 h-72 w-72 rounded-full bg-orange-100/80 blur-2xl" />
      </div>

      <section className="relative mx-auto flex w-full max-w-6xl flex-col gap-8">
        <nav className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/"
            className="rounded-2xl border-2 border-black bg-white px-5 py-3 text-sm font-black text-rose-700 shadow-[4px_4px_0_#111827] transition active:scale-[0.99] md:hover:-translate-y-0.5"
          >
            Back to home
          </Link>
          <Link
            href="/"
            className="rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-black text-white shadow-[4px_4px_0_#fb7185] transition active:scale-[0.99] md:hover:-translate-y-0.5"
          >
            Start or join a game
          </Link>
        </nav>

        <div className="rounded-[2rem] border-4 border-black bg-white/95 p-6 shadow-[10px_10px_0_#111827] md:p-8">
          <p className="text-sm font-extrabold uppercase tracking-[0.25em] text-rose-700">
            How to play
          </p>
          <div className="mt-3 grid grid-cols-1 gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <h1 className="text-4xl font-black tracking-tight md:text-6xl">
                A party game for bad answers and better pictures.
              </h1>
              <p className="mt-4 max-w-2xl text-lg font-bold leading-relaxed text-zinc-700">
                Picture This is simple: friends write answers, AI draws them, and everyone
                votes on the image that causes the most damage to the group chat.
              </p>
            </div>

            <div className="rounded-3xl border-2 border-black bg-rose-50 p-5 shadow-[5px_5px_0_#111827]">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-rose-700">
                Quick rules
              </p>
              <ul className="mt-4 space-y-3 text-sm font-bold leading-relaxed text-zinc-700">
                <li>Rooms support 2–8 players.</li>
                <li>Keep answers short so the image is easier to understand.</li>
                <li>Images are anonymous while voting.</li>
                <li>Win rounds by getting votes. First to 3 points wins the game.</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
            {steps.map((step) => (
              <div
                key={step.number}
                className="rounded-3xl border-2 border-black bg-[#fff7ed] p-5 shadow-[5px_5px_0_#111827]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-black bg-rose-600 text-lg font-black text-white">
                  {step.number}
                </div>
                <h2 className="mt-5 text-2xl font-black">{step.title}</h2>
                <p className="mt-2 text-sm font-bold leading-relaxed text-zinc-600">
                  {step.description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-3xl border-2 border-black bg-zinc-950 p-6 text-white shadow-[5px_5px_0_#fb7185]">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-rose-200">
              Host tip
            </p>
            <p className="mt-2 text-2xl font-black">
              The best answers are visual, specific, and slightly unhinged.
            </p>
            <p className="mt-2 font-bold text-zinc-300">
              “A raccoon in a tuxedo stealing the wedding cake” usually beats “something funny.”
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
