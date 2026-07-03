import Link from "next/link";

const LAST_UPDATED = "July 3, 2026";

export default function PrivacyPolicyPage() {
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
            href="/terms"
            className="rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-black text-white shadow-[4px_4px_0_#fb7185] transition active:scale-[0.99] md:hover:-translate-y-0.5"
          >
            Terms of Service
          </Link>
        </nav>

        <div className="rounded-[2rem] border-4 border-black bg-white/95 p-6 shadow-[10px_10px_0_#111827] md:p-8">
          <p className="text-sm font-extrabold uppercase tracking-[0.25em] text-rose-700">
            Privacy Policy
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight">
            What we collect when you play Picture This.
          </h1>
          <p className="mt-3 font-bold text-zinc-600">Last updated: {LAST_UPDATED}</p>

          <div className="mt-8 space-y-6 text-sm font-bold leading-relaxed text-zinc-700">
            <section>
              <h2 className="text-lg font-black text-black">1. What we collect</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>
                  <strong>Player name and avatar</strong> — the name and (optional) avatar photo
                  you type in when joining a room. This is stored against a room code, not a
                  real-world identity.
                </li>
                <li>
                  <strong>Answers and generated images</strong> — the text you submit each round
                  and the AI-generated image created from it, stored so the room can play and
                  vote, and kept in a gallery of past rounds.
                </li>
                <li>
                  <strong>Approximate location and device info</strong> — city/region/country
                  (derived from your network, not GPS) and basic device/browser type, recorded
                  against gameplay events for analytics and abuse prevention.
                </li>
                <li>
                  <strong>Purchase information</strong> — if you buy a Game Night Pass, your
                  email address and payment confirmation (processed by Stripe; we never see or
                  store your card number).
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-black text-black">2. How we use it</h2>
              <p className="mt-2">
                To run the game itself (matching answers to images, running votes, keeping
                score), to investigate reported images, to prevent abuse of image generation,
                and to understand how the game is used so we can improve it. We do not sell your
                data.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-black text-black">3. AI-generated content</h2>
              <p className="mt-2">
                Your answers are sent to a third-party AI image provider to generate an image
                for your round. Providers may retain data per their own policies; we do not
                control that retention. Generated images are stored in our own storage and may
                be shown to other players in your room and, for past-round highlights, in a
                gallery view.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-black text-black">4. Reporting and moderation</h2>
              <p className="mt-2">
                If a player reports an image, we record the report along with the room, round,
                and submission it relates to so we can review and, if warranted, remove the
                image and restrict further submissions from that player in that room.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-black text-black">5. Retention</h2>
              <p className="mt-2">
                Room and round data is kept to support gameplay history and moderation. You can
                request deletion of data tied to your player name or email by contacting us (see
                below).
              </p>
            </section>

            <section>
              <h2 className="text-lg font-black text-black">6. Children</h2>
              <p className="mt-2">
                Picture This is intended for players 13 and older. Players under 13 should only
                join with a parent or guardian present and supervising.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-black text-black">7. Contact</h2>
              <p className="mt-2">
                Questions about this policy or a data deletion request? Reach out to the contact
                listed on our home page or app store listing.
              </p>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
