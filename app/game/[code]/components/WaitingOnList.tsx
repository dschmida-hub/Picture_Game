type WaitingOnListProps = {
  title: string;
  names: string[];
  emptyMessage: string;
};

export function WaitingOnList({ title, names, emptyMessage }: WaitingOnListProps) {
  return (
    <div className="w-full max-w-xl rounded-2xl border border-white/20 bg-white/10 p-4 text-center text-white">
      <p className="text-xs font-extrabold uppercase tracking-wider opacity-80">{title}</p>
      {names.length > 0 ? (
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {names.map((name) => (
            <span key={name} className="rounded-full bg-white/20 px-3 py-1 text-sm font-bold">
              {name}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm font-bold opacity-90">{emptyMessage}</p>
      )}
    </div>
  );
}
