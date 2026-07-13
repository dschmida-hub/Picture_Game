export function GameLogo() {
  return (
    <div className="flex items-center justify-center gap-2 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/mascot/mascot-sprite.png"
        alt=""
        aria-hidden="true"
        className="h-16 w-auto shrink-0"
      />
      <h1 className="text-4xl font-black tracking-tight">
        <span className="inline-block -rotate-2 text-rose-600">Picture</span>{" "}
        <span className="inline-block rotate-2 rounded-xl bg-black px-3 py-1 text-white">
          This
        </span>
      </h1>
    </div>
  );
}
