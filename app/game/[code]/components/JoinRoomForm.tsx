type JoinRoomFormProps = {
  code: string;
  name: string;
  backgroundImages?: string[];
  isJoining: boolean;
  ageConfirmed: boolean;
  onNameChange: (name: string) => void;
  onAvatarFileChange: (file: File | null) => void;
  onAgeConfirmedChange: (confirmed: boolean) => void;
  onJoinGame: () => void;
};

export function JoinRoomForm({
  code,
  name,
  backgroundImages = [],
  isJoining,
  ageConfirmed,
  onNameChange,
  onAvatarFileChange,
  onAgeConfirmedChange,
  onJoinGame,
}: JoinRoomFormProps) {
  const collageImages = backgroundImages.slice(0, 8);

  return (
    <>
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,#fed7aa,transparent_32%),radial-gradient(circle_at_bottom_right,#fecdd3,transparent_34%),linear-gradient(135deg,#fff7ed,#ffe4e6)]" />

        {collageImages.length > 0 ? (
          <div className="absolute inset-0 opacity-35 blur-[0.5px]">
            {collageImages.map((imageUrl, index) => {
              const positions = [
                "left-[3%] top-[8%] rotate-[-10deg]",
                "right-[5%] top-[10%] rotate-[8deg]",
                "left-[8%] bottom-[10%] rotate-[7deg]",
                "right-[8%] bottom-[9%] rotate-[-8deg]",
                "left-[38%] top-[4%] rotate-[4deg]",
                "left-[42%] bottom-[5%] rotate-[-5deg]",
                "left-[1%] top-[44%] rotate-[11deg]",
                "right-[1%] top-[45%] rotate-[-11deg]",
              ];

              return (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={`${imageUrl}-${index}`}
                  src={imageUrl}
                  alt=""
                  aria-hidden="true"
                  className={`absolute h-28 w-28 rounded-3xl border-2 border-black object-cover shadow-[6px_6px_0_#111827] md:h-40 md:w-40 ${positions[index]}`}
                />
              );
            })}
          </div>
        ) : (
          <>
            <div className="absolute -left-16 top-16 h-44 w-44 rounded-full bg-rose-200/80" />
            <div className="absolute -right-12 bottom-20 h-48 w-48 rounded-full bg-orange-200/80" />
            <div className="absolute left-[12%] bottom-[18%] h-24 w-24 rotate-12 rounded-[2rem] border-2 border-black bg-white/70 shadow-[5px_5px_0_#111827]" />
            <div className="absolute right-[13%] top-[18%] h-20 w-20 -rotate-12 rounded-full border-2 border-black bg-rose-100/80 shadow-[5px_5px_0_#111827]" />
          </>
        )}

        <div className="absolute inset-0 bg-[#fff7ed]/70 backdrop-blur-[1px]" />
      </div>

      <section className="relative z-10 w-full max-w-xl overflow-hidden rounded-[2rem] border-2 border-black bg-white/95 p-6 text-zinc-950 shadow-[8px_8px_0_#111827] md:p-8">
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-rose-200" />
        <div className="absolute -bottom-12 -left-12 h-36 w-36 rounded-full bg-orange-200" />

      <div className="relative">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-rose-700">
              Join the chaos
            </p>
            <h1 className="mt-2 text-3xl font-black">Step into the room</h1>
          </div>

          <div className="rotate-2 rounded-2xl border-2 border-black bg-zinc-950 px-4 py-3 text-center text-white shadow-[4px_4px_0_#fb7185]">
            <p className="text-[10px] font-black uppercase tracking-widest text-rose-200">
              Code
            </p>
            <p className="text-xl font-black tracking-widest">{code}</p>
          </div>
        </div>

        <p className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-950">
          Add your name and, if you want, a photo so the AI can drag you into the joke properly.
        </p>

        <div className="space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm font-extrabold text-gray-700">
              Your display name
            </span>
            <input
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && name.trim() && ageConfirmed && !isJoining) {
                  onJoinGame();
                }
              }}
              maxLength={40}
              className="w-full rounded-2xl border-2 border-black bg-white p-4 text-lg font-bold outline-none transition focus:border-rose-600 focus:shadow-[0_0_0_4px_rgba(225,29,72,0.18)]"
            />
          </label>

          <label className="flex items-start gap-3 rounded-2xl border-2 border-black bg-zinc-50 p-4">
            <input
              type="checkbox"
              checked={ageConfirmed}
              onChange={(event) => onAgeConfirmedChange(event.target.checked)}
              className="mt-1 h-5 w-5 shrink-0 accent-rose-600"
            />
            <span className="text-sm font-bold text-zinc-700">
              I&apos;m 13 or older, or a parent/guardian is playing with me. I agree to the{" "}
              <a href="/terms" target="_blank" rel="noreferrer" className="underline">
                Terms
              </a>{" "}
              and{" "}
              <a href="/privacy" target="_blank" rel="noreferrer" className="underline">
                Privacy Policy
              </a>
              .
            </span>
          </label>

          <label className="block rounded-2xl border-2 border-dashed border-rose-300 bg-rose-50 p-4">
            <span className="block text-sm font-extrabold text-rose-900">
              Optional avatar photo
            </span>
            <span className="mt-1 block text-xs font-bold text-rose-800/70">
              Helps the AI know what you look like when you or a friend mention you by name in an
              answer.
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => onAvatarFileChange(event.target.files?.[0] || null)}
              className="mt-3 w-full text-sm font-bold file:mr-4 file:rounded-xl file:border-0 file:bg-zinc-950 file:px-4 file:py-2 file:font-extrabold file:text-white"
            />
          </label>

          <button
            onClick={onJoinGame}
            disabled={isJoining || !name.trim() || !ageConfirmed}
            className="w-full rounded-2xl bg-rose-600 px-6 py-4 text-lg font-black text-white shadow-[5px_5px_0_#111827] transition hover:-translate-y-0.5 hover:bg-rose-700 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isJoining ? "Joining Room..." : "Join Room"}
          </button>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3 text-center text-xs font-black text-zinc-700">
          <div className="rounded-xl border-2 border-black bg-rose-50 p-3 shadow-[3px_3px_0_#111827]">Write</div>
          <div className="rounded-xl border-2 border-black bg-orange-50 p-3 shadow-[3px_3px_0_#111827]">Generate</div>
          <div className="rounded-xl border-2 border-black bg-yellow-50 p-3 shadow-[3px_3px_0_#111827]">Vote</div>
        </div>
      </div>
      </section>
    </>
  );
}
