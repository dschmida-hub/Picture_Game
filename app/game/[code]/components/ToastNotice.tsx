export type ToastTone = "info" | "success" | "error";

type ToastNoticeProps = {
  message: string;
  tone?: ToastTone;
  onDismiss: () => void;
};

const toneClasses: Record<ToastTone, string> = {
  info: "bg-sky-100 text-sky-950",
  success: "bg-emerald-100 text-emerald-950",
  error: "bg-rose-100 text-rose-950",
};

export function ToastNotice({ message, tone = "info", onDismiss }: ToastNoticeProps) {
  if (!message) return null;

  return (
    <div
      className="fixed inset-x-4 top-4 z-[100] mx-auto max-w-md"
      style={{ top: "max(1rem, env(safe-area-inset-top))" }}
      role={tone === "error" ? "alert" : "status"}
      aria-live={tone === "error" ? "assertive" : "polite"}
    >
      <div className={`rounded-2xl border-2 border-black p-4 shadow-[6px_6px_0_#111827] ${toneClasses[tone]}`}>
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-black bg-white text-xs font-black">
            !
          </div>
          <p className="min-w-0 flex-1 text-sm font-black leading-snug">{message}</p>
          <button
            type="button"
            onClick={onDismiss}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-black bg-white"
            aria-label="Dismiss notification"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5">
              <path
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="3"
                d="M5 5l14 14M19 5L5 19"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
