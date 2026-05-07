export function RefreshIndicator({ active, className = '' }) {
  if (!active) return null;
  return (
    <div
      className={`pointer-events-none relative h-1 w-full overflow-hidden rounded-full bg-slate-200/90 ${className}`}
      aria-hidden
    >
      <div className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-gradient-to-r from-brand-500 via-indigo-500 to-brand-500 tp-indeterminate-bar" />
    </div>
  );
}
