type JoinRoomFormProps = {
  code: string;
  name: string;
  isJoining: boolean;
  onNameChange: (name: string) => void;
  onAvatarFileChange: (file: File | null) => void;
  onJoinGame: () => void;
};

export function JoinRoomForm({
  code,
  name,
  isJoining,
  onNameChange,
  onAvatarFileChange,
  onJoinGame,
}: JoinRoomFormProps) {
  return (
    <section className="relative w-full max-w-xl overflow-hidden rounded-[2rem] border-2 border-black bg-white p-6 text-zinc-950 shadow-[8px_8px_0_#111827] md:p-8">
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-rose-200" />
      <div className="absolute -bottom-12 -left-12 h-36 w-36 rounded-full bg-sky-200" />

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
                if (event.key === "Enter" && name.trim() && !isJoining) {
                  onJoinGame();
                }
              }}
            
              className="w-full rounded-2xl border-2 border-black bg-white p-4 text-lg font-bold outline-none transition focus:border-rose-600 focus:shadow-[0_0_0_4px_rgba(225,29,72,0.18)]"
            />
          </label>

          <label className="block rounded-2xl border-2 border-dashed border-rose-300 bg-rose-50 p-4">
            <span className="block text-sm font-extrabold text-rose-900">
              Optional avatar photo
            </span>
            <span className="mt-1 block text-xs font-bold text-rose-800/70">
              Helps the AI know what you look like when your friends mention you.
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
            disabled={isJoining || !name.trim()}
            className="w-full rounded-2xl bg-rose-600 px-6 py-4 text-lg font-black text-white shadow-[5px_5px_0_#111827] transition hover:-translate-y-0.5 hover:bg-rose-700 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isJoining ? "Joining Room..." : "Join Room"}
          </button>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3 text-center text-xs font-black text-zinc-700">
          <div className="rounded-xl border border-zinc-200 bg-white p-3">Write</div>
          <div className="rounded-xl border border-zinc-200 bg-white p-3">Generate</div>
          <div className="rounded-xl border border-zinc-200 bg-white p-3">Vote</div>
        </div>
      </div>
    </section>
  );
}
