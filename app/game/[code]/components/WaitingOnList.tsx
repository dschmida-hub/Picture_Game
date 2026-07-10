type WaitingOnListProps = {
  title: string;
  names: string[];
  emptyMessage: string;
};

export function WaitingOnList({ title, names, emptyMessage }: WaitingOnListProps) {
  return (
    <div className="w-full max-w-xl rounded-3xl border-2 border-black bg-sky-100 p-4 text-center text-zinc-950 shadow-[5px_5px_0_#111827]">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-800">{title}</p>
      {names.length > 0 ? (
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {names.map((name) => (
            <span
              key={name}
              title={name}
              className="max-w-[10rem] truncate rounded-full border border-sky-200 bg-white px-3 py-1 text-sm font-black text-sky-900"
            >
              {name}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm font-black text-emerald-700">{emptyMessage}</p>
      )}
    </div>
  );
}
