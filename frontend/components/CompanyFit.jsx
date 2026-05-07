import { Building2, ListChecks, AlertTriangle } from 'lucide-react';

export function CompanyFit({ matchedServices = [], unmatchedRequirements = [], fitExplanation }) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card sm:p-8">
      <div className="flex items-center gap-2">
        <Building2 className="h-5 w-5 text-brand-600" aria-hidden />
        <h2 className="text-lg font-semibold text-slate-900">Company fit</h2>
      </div>
      <p className="mt-1 text-sm leading-relaxed text-slate-600">
        How this job lines up with the company details you entered when you ran the analysis.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <ListChecks className="h-4 w-4 text-emerald-600" />
            Strong matches
          </h3>
          {matchedServices.length ? (
            <ul className="mt-3 list-inside list-disc space-y-1.5 text-sm text-slate-700">
              {matchedServices.map((s, i) => (
                <li key={i} className="marker:text-emerald-500">
                  {s}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-500">None listed.</p>
          )}
        </div>
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Gaps or extra scope
          </h3>
          {unmatchedRequirements.length ? (
            <ul className="mt-3 list-inside list-disc space-y-1.5 text-sm text-slate-700">
              {unmatchedRequirements.map((s, i) => (
                <li key={i} className="marker:text-amber-500">
                  {s}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-500">None listed.</p>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-xl bg-slate-50/80 p-4 ring-1 ring-slate-100">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">In short</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-800">{fitExplanation}</p>
      </div>
    </section>
  );
}
