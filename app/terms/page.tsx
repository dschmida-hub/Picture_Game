import Link from "next/link";

const LAST_UPDATED = "July 3, 2026";

export default function TermsOfServicePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fff7ed] px-5 py-8 text-black md:px-8 md:py-12">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[#fff7ed]" />
        <div className="absolute -left-20 top-24 h-72 w-72 rounded-full bg-rose-100/80 blur-2xl" />
        <div className="absolute -right-24 bottom-10 h-72 w-72 rounded-full bg-orange-100/80 blur-2xl" />
      </div>

      <section className="relative mx-auto flex w-full max-w-3xl flex-col gap-8">
        <nav className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/"
            className="rounded-2xl border-2 border-black bg-white px-5 py-3 text-sm font-black text-rose-700 shadow-[4px_4px_0_#111827] transition active:scale-[0.99] md:hover:-translate-y-0.5"
          >
            Back to home
          </Link>
          <Link
            href="/privacy"
            className="rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-black text-white shadow-[4px_4px_0_#fb7185] transition active:scale-[0.99] md:hover:-translate-y-0.5"
          >
            Privacy Policy
          </Link>
        </nav>

        <div className="rounded-[2rem] border-4 border-black bg-white/95 p-6 shadow-[10px_10px_0_#111827] md:p-8">
          <p className="text-sm font-extrabold uppercase tracking-[0.25em] text-rose-700">
            Terms of Service
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight">
            The rules for playing Picture This.
          </h1>
          <p className="mt-3 font-bold text-zinc-600">Last updated: {LAST_UPDATED}</p>

          <div className="mt-8 space-y-6 text-sm font-bold leading-relaxed text-zinc-700">
            <section>
              <h2 className="text-lg font-black text-black">1. Age requirement</h2>
              <p className="mt-2">
                You must be 13 or older to create or join a room. Players under 13 may only play
                with a parent or guardian present and supervising the session.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-black text-black">2. Acceptable use</h2>
              <p className="mt-2">
                Don&apos;t submit answers or prompts that are illegal, harass or threaten another
                person, sexualize minors, or attempt to bypass our content filters. We may block
                a submission, remove a generated image, or restrict a player from a room for
                violating this rule, with or without notice.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-black text-black">3. AI-generated images</h2>
              <p className="mt-2">
                Images are generated automatically from player answers by a third-party AI
                provider. We filter and review reported content but cannot guarantee every image
                will be appropriate for every audience. Content ratings you select for a room
                (e.g. &quot;Everyone&quot; vs. &quot;PG-13&quot;) adjust generation guidance but
                are not a perfect guarantee.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-black text-black">4. Game Night Passes</h2>
              <p className="mt-2">
                Game Night Passes are a one-time purchase that unlock a set number of paid game
                sessions. Passes are non-refundable once redeemed for a session, except where
                required by law. Unredeemed passes tied to a lost account can be recovered using
                the email associated with your purchase.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-black text-black">5. No warranty</h2>
              <p className="mt-2">
                The game is provided &quot;as is.&quot; We don&apos;t guarantee it will always be
                available, bug-free, or that generated images will meet your expectations.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-black text-black">6. Changes</h2>
              <p className="mt-2">
                We may update these terms as the game changes. Continued use after an update
                means you accept the revised terms.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-black text-black">7. Contact</h2>
              <p className="mt-2">
                Questions about these terms? Reach out to the contact listed on our home page or
                app store listing.
              </p>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
