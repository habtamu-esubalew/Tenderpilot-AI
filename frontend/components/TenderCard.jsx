import Link from 'next/link';
import { Calendar, Building2, Tag, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/Badge';
import { formatDeadlineLabel, recommendationLabel, riskLabel } from '@/lib/formatters';

export function TenderCard({ tender }) {
  const rec = tender.recommendation;
  const risk = tender.riskLevel;

  return (
    <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card transition hover:shadow-card-md">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 font-semibold leading-snug text-slate-900">{tender.title}</h3>
          <div className="mt-3 flex flex-col gap-2 text-sm text-slate-600">
            <p className="flex items-center gap-2 truncate">
              <Building2 className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
              <span className="truncate">{tender.client}</span>
            </p>
            <p className="flex items-center gap-2">
              <Tag className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
              <span>{tender.category}</span>
            </p>
            <p className="flex items-center gap-2">
              <Calendar className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
              <span>{formatDeadlineLabel(tender.deadline)}</span>
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="rounded-xl bg-slate-900 px-3 py-1.5 text-sm font-bold tabular-nums text-white">
            {tender.bidFitScore}
            <span className="text-slate-400">/100</span>
          </span>
          <Badge recommendation={rec}>{recommendationLabel(rec)}</Badge>
          <Badge risk={risk}>Risk: {riskLabel(risk)}</Badge>
        </div>
      </div>
      <div className="mt-5 flex justify-end border-t border-slate-100 pt-4">
        <Link
          href={`/tenders/${tender.id}`}
          className="group inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 min-h-[44px]"
        >
          View details
          <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
        </Link>
      </div>
    </article>
  );
}
