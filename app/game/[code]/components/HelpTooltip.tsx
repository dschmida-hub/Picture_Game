type HelpTooltipProps = {
  text: string;
  label?: string;
  className?: string;
};

export function HelpTooltip({ text, label = "?", className = "" }: HelpTooltipProps) {
  return (
    <span className={`group relative inline-flex align-middle ${className}`}>
      <span
        tabIndex={0}
        aria-label={text}
        className="inline-flex h-6 w-6 cursor-help items-center justify-center rounded-full border-2 border-black bg-white text-xs font-black text-zinc-950 shadow-[2px_2px_0_#111827] outline-none transition focus:bg-rose-100"
      >
        {label}
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-8 z-[80] w-56 -translate-x-1/2 rounded-2xl border-2 border-black bg-zinc-950 px-3 py-2 text-left text-xs font-bold leading-snug text-white opacity-0 shadow-[4px_4px_0_#fb7185] transition group-focus-within:opacity-100 group-hover:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}
