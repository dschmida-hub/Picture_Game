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
    <section className="relative w-full max-w-xl overflow-hidden rounded-[2rem] border-4 border-black bg-white p-6 text-black shadow-2xl md:p-8">
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-purple-200" />
      <div className="absolute -bottom-12 -left-12 h-36 w-36 rounded-full bg-yellow-200" />

      <div className="relative">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.25em] text-purple-600">
              Join the chaos
            </p>
            <h1 className="mt-2 text-3xl font-black">Step into the room</h1>
          </div>

          <div className="rotate-2 rounded-2xl bg-black px-4 py-3 text-center text-white shadow-lg">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-purple-200">
              Code
            </p>
            <p className="text-xl font-black tracking-widest">{code}</p>
          </div>
        </div>

        <p className="mb-6 rounded-2xl bg-purple-50 p-4 text-sm font-bold text-purple-900">
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
              placeholder="Dave, Vicky, The Chaos Goblin..."
              className="w-full rounded-2xl border-2 border-black bg-white p-4 text-lg font-bold outline-none transition focus:border-purple-600 focus:shadow-[0_0_0_4px_rgba(147,51,234,0.18)]"
            />
          </label>

          <label className="block rounded-2xl border-2 border-dashed border-purple-300 bg-purple-50 p-4">
            <span className="block text-sm font-extrabold text-purple-800">
              Optional avatar photo
            </span>
            <span className="mt-1 block text-xs font-bold text-purple-700/70">
              Helps the AI know what you look like when your friends mention you.
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => onAvatarFileChange(event.target.files?.[0] || null)}
              className="mt-3 w-full text-sm font-bold file:mr-4 file:rounded-xl file:border-0 file:bg-black file:px-4 file:py-2 file:font-extrabold file:text-white"
            />
          </label>

          <button
            onClick={onJoinGame}
            disabled={isJoining || !name.trim()}
            className="w-full rounded-2xl bg-purple-600 px-6 py-4 text-lg font-extrabold text-white shadow-lg shadow-purple-300 transition hover:-translate-y-0.5 hover:bg-purple-700 disabled:translate-y-0 disabled:opacity-50"
          >
            {isJoining ? "Joining Room..." : "Join Room"}
          </button>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3 text-center text-xs font-extrabold text-gray-600">
          <div className="rounded-xl bg-gray-100 p-3">Write</div>
          <div className="rounded-xl bg-gray-100 p-3">Generate</div>
          <div className="rounded-xl bg-gray-100 p-3">Vote</div>
        </div>
      </div>
    </section>
  );
}
