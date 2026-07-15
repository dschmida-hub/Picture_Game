type ConnectionStatusBannerProps = {
  isOffline: boolean;
  isReconnecting: boolean;
};

export function ConnectionStatusBanner({ isOffline, isReconnecting }: ConnectionStatusBannerProps) {
  if (!isOffline && !isReconnecting) return null;

  return (
    <div
      className="fixed inset-x-0 top-0 z-[110] flex justify-center px-3 pt-3"
      style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      role="status"
    >
      <div
        className={`flex items-center gap-2 rounded-full border-2 border-black px-4 py-2 text-sm font-black shadow-[4px_4px_0_#111827] ${
          isOffline ? "bg-rose-600 text-white" : "bg-amber-300 text-zinc-950"
        }`}
      >
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
              isOffline ? "bg-white" : "bg-zinc-950"
            }`}
          />
          <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${isOffline ? "bg-white" : "bg-zinc-950"}`} />
        </span>
        {isOffline ? "You're offline" : "Reconnecting..."}
      </div>
    </div>
  );
}
