import { ShieldAlert } from 'lucide-react';

const severityStyle = {
  high: 'border-red-200 bg-red-50/80',
  medium: 'border-amber-200 bg-amber-50/80',
  low: 'border-sky-200 bg-sky-50/80',
};

export function RiskFlags({ flags = [] }) {
  if (!flags.length) {
    return (
      <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card sm:p-8">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-brand-600" aria-hidden />
          <h2 className="text-lg font-semibold text-slate-900">Risks</h2>
        </div>
        <p className="mt-3 text-sm text-slate-600">
          No separate risk list for this one. Still read the summary and requirements before you bid.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card sm:p-8">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-5 w-5 text-brand-600" aria-hidden />
        <h2 className="text-lg font-semibold text-slate-900">Risks</h2>
      </div>
      <p className="mt-1 text-sm leading-relaxed text-slate-600">
        Things that could bite on timing, rules, or getting your bid in. Labels show how sure the model
        is—this is not legal advice.
      </p>
      <ul className="mt-5 space-y-3">
        {flags.map((f) => {
          const sev = String(f.severity || 'medium').toLowerCase();
          const box = severityStyle[sev] || severityStyle.medium;
          return (
            <li
              key={f.id || `${f.title}-${f.description}`}
              className={`rounded-xl border px-4 py-3 ${box}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-900">{f.title}</span>
                <span className="rounded-md bg-white/70 px-2 py-0.5 text-xs font-semibold capitalize text-slate-700 ring-1 ring-slate-200/80">
                  {sev}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-800">{f.description}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
