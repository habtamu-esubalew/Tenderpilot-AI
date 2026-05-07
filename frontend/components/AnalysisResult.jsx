import Link from 'next/link';
import {
  Building2,
  Calendar,
  ClipboardList,
  FileText,
  Sparkles,
  Tag,
  Target,
} from 'lucide-react';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Checklist } from '@/components/Checklist';
import { CompanyFit } from '@/components/CompanyFit';
import { RiskFlags } from '@/components/RiskFlags';
import { bidFitTier, confidenceLabel, formatDeadlineLabel, recommendationLabel, riskLabel } from '@/lib/formatters';
import { getTenderView } from '@/lib/tenderView';

function ScoreRing({ score }) {
  const { tier } = bidFitTier(score);
  const color =
    tier === 'strong'
      ? { stroke: '#059669', bg: 'bg-emerald-50', text: 'text-emerald-800' }
      : tier === 'caution'
        ? { stroke: '#d97706', bg: 'bg-amber-50', text: 'text-amber-900' }
        : { stroke: '#dc2626', bg: 'bg-red-50', text: 'text-red-800' };

  const r = 52;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border border-slate-100 p-6 sm:p-8 ${color.bg}`}
    >
      <div className="relative h-36 w-36" aria-hidden>
        <svg className="-rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke={color.stroke}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className={`text-3xl font-bold tabular-nums ${color.text}`}>{score}</span>
          <span className="text-xs font-medium text-slate-500">Bid fit</span>
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-slate-700 sm:text-sm">
        Score helps you decide if this bid is worth your time.
      </p>
    </div>
  );
}

function RequirementsList({ title, items, emptyLabel }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card sm:p-8">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-slate-700">
        {items?.length ? (
          items.map((line, i) => (
            <li key={i} className="marker:text-brand-500">
              {line}
            </li>
          ))
        ) : (
          <li className="list-none text-slate-500">{emptyLabel}</li>
        )}
      </ul>
    </div>
  );
}

export function AnalysisResult({ tenderRaw, onAnalyzeAnother }) {
  const v = getTenderView(tenderRaw);
  if (!v) return null;

  return (
    <div className="space-y-8">
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card-md">
        <div className="border-b border-slate-100 bg-gradient-to-r from-brand-50 to-white px-6 py-5 sm:px-8">
          <div className="flex flex-wrap items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand-600" aria-hidden />
            <span className="text-xs font-bold uppercase tracking-wide text-brand-700">
              Tender analysis
            </span>
          </div>
          <h2 className="mt-2 break-words text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{v.title}</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge recommendation={v.recommendation}>{recommendationLabel(v.recommendation)}</Badge>
            <Badge risk={v.riskLevel}>Risk: {riskLabel(v.riskLevel)}</Badge>
            <Badge confidence={v.confidence}>Confidence: {confidenceLabel(v.confidence)}</Badge>
          </div>
        </div>
        <div className="grid gap-6 p-6 sm:grid-cols-2 sm:p-8">
          <div className="space-y-4 text-sm">
            <p className="flex items-start gap-2 text-slate-700">
              <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <span>
                <span className="font-medium text-slate-900">Client: </span>
                {v.client}
              </span>
            </p>
            <p className="flex items-start gap-2 text-slate-700">
              <Tag className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <span>
                <span className="font-medium text-slate-900">Category: </span>
                {v.category}
              </span>
            </p>
            <p className="flex items-start gap-2 text-slate-700">
              <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <span>
                <span className="font-medium text-slate-900">Deadline: </span>
                {formatDeadlineLabel(v.deadline)}
              </span>
            </p>
          </div>
          <ScoreRing score={v.bidFitScore} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-100 bg-gradient-to-br from-indigo-50/80 to-white p-6 shadow-card sm:p-8">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-brand-600" />
            <h3 className="text-lg font-semibold text-slate-900">What to do next</h3>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-800">{v.nextBestAction}</p>
        </section>
        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card sm:p-8">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-brand-600" />
            <h3 className="text-lg font-semibold text-slate-900">Why we said this</h3>
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{v.reasoning}</p>
        </section>
      </div>

      <CompanyFit
        matchedServices={v.companyFit.matchedServices}
        unmatchedRequirements={v.companyFit.unmatchedRequirements}
        fitExplanation={v.companyFit.fitExplanation}
      />

      <RiskFlags flags={v.riskFlags} />

      <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card sm:p-8">
        <h3 className="text-lg font-semibold text-slate-900">Still unclear</h3>
        <p className="mt-1 text-sm text-slate-600">
          Points you may want to clear up before you commit people and budget.
        </p>
        <ul className="mt-4 list-inside list-decimal space-y-2 text-sm text-slate-700">
          {v.missingInformation.length ? (
            v.missingInformation.map((line, i) => (
              <li key={i} className="marker:font-semibold marker:text-brand-600">
                {line}
              </li>
            ))
          ) : (
            <li className="list-none text-slate-500">None called out.</li>
          )}
        </ul>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <RequirementsList
          title="Required documents"
          items={v.requirements.requiredDocuments}
          emptyLabel="Nothing found in the pasted text."
        />
        <RequirementsList
          title="Eligibility criteria"
          items={v.requirements.eligibilityCriteria}
          emptyLabel="Nothing found in the pasted text."
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <RequirementsList
          title="Financial requirements"
          items={v.requirements.financialRequirements}
          emptyLabel="Nothing found in the pasted text."
        />
        <RequirementsList
          title="Technical requirements"
          items={v.requirements.technicalRequirements}
          emptyLabel="Nothing found in the pasted text."
        />
      </div>

      <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card sm:p-8">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-brand-600" />
          <h3 className="text-lg font-semibold text-slate-900">Checklist preview</h3>
        </div>
        <p className="mt-1 text-sm text-slate-600">
          Tasks from the notice. Open the tender page to check items off and save progress.
        </p>
        <div className="mt-4">
          <Checklist items={v.checklistItems} readOnly />
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        {onAnalyzeAnother && (
          <Button type="button" variant="secondary" className="sm:min-w-[200px]" onClick={onAnalyzeAnother}>
            Analyze another tender
          </Button>
        )}
        <Link
          href={`/tenders/${v.id}`}
          className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-brand-600 px-5 py-3 text-center text-base font-semibold text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 sm:w-auto sm:min-w-[240px]"
        >
          Open full tender page
        </Link>
      </div>
    </div>
  );
}
