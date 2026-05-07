export function StatCard({ label, value, icon: Icon, hint, accent = 'brand' }) {
  const accents = {
    brand: 'bg-brand-50 text-brand-600',
    slate: 'bg-slate-100 text-slate-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
  };
  const accentClass = accents[accent] || accents.brand;
  return (
    <article className="min-w-0 rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        {Icon && (
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accentClass}`}
          >
            <Icon className="h-5 w-5" aria-hidden />
          </span>
        )}
      </div>
      <p className="mt-4 min-w-0 text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-slate-900 sm:text-3xl">
        {value}
      </p>
      {hint && <p className="mt-2 text-xs leading-relaxed text-slate-500">{hint}</p>}
    </article>
  );
}
