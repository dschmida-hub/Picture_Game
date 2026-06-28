type LoadingScreenProps = {
  title: string;
  message: string;
  icon?: string;
};

function LoaderMark() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className="h-16 w-16 animate-spin text-rose-600">
      <circle cx="32" cy="32" r="24" fill="none" stroke="currentColor" strokeWidth="8" opacity=".18" />
      <path fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="8" d="M56 32A24 24 0 0 0 32 8" />
    </svg>
  );
}

export function LoadingScreen({ title, message }: LoadingScreenProps) {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#fff7ed] p-6 text-zinc-950">
      <div className="rounded-[2rem] border-2 border-black bg-white p-8 text-center shadow-[8px_8px_0_#111827]">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-rose-100">
          <LoaderMark />
        </div>
        <h1 className="mt-6 text-3xl font-black tracking-tight">{title}</h1>
        <p className="mt-2 max-w-sm font-bold text-zinc-600">{message}</p>
      </div>
    </div>
  );
}
