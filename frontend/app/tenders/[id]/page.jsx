'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { ArrowLeft, Brain, Building2, Calendar, FileText, ListTree, Tag } from 'lucide-react';
import { extractApiErrorMessage, getTenderById } from '@/lib/api';
import { getTenderView } from '@/lib/tenderView';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Checklist } from '@/components/Checklist';
import { CompanyFit } from '@/components/CompanyFit';
import { RiskFlags } from '@/components/RiskFlags';
import { AutomationPanel } from '@/components/AutomationPanel';
import { AgentActionLog } from '@/components/AgentActionLog';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { RefreshIndicator } from '@/components/RefreshIndicator';
import { useToast } from '@/components/ToastProvider';
import {
  confidenceLabel,
  displayText,
  formatDeadlineLabel,
  recommendationLabel,
  riskLabel,
} from '@/lib/formatters';

function TextListCard({ title, description, items, emptyLabel, icon: Icon }) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card sm:p-8">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-5 w-5 text-brand-600" />}
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      </div>
      {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
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
    </section>
  );
}

export default function TenderWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;
  const { showToast } = useToast();
  const [raw, setRaw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(
    async (options = {}) => {
      const silent = options.silent === true;
      if (!id) return;
      if (silent) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
        setNotFound(false);
      }
      try {
        const data = await getTenderById(id);
        setRaw(data);
      } catch (e) {
        const status = axios.isAxiosError(e) ? e.response?.status : undefined;
        if (status === 404) {
          setNotFound(true);
          setRaw(null);
        } else {
          showToast(extractApiErrorMessage(e), 'error');
        }
      } finally {
        if (silent) {
          setIsRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [id, showToast],
  );

  useEffect(() => {
    load({ silent: false });
  }, [load]);

  if (loading && !raw) {
    return (
      <LoadingSpinner
        label="Loading tender…"
        hint="Fetching the analysis, checklist, and activity for this tender."
      />
    );
  }

  if (notFound || !raw) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center shadow-card">
          <p className="text-lg font-semibold text-slate-900">Tender not found</p>
        <p className="mt-2 text-sm text-slate-600">
          It may have been removed, or the link is wrong.
        </p>
        <Button
          type="button"
          variant="secondary"
          className="mt-6 gap-2"
          onClick={() => router.push('/')}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Return to dashboard
        </Button>
      </div>
    );
  }

  const v = getTenderView(raw);
  const hasDeadline = Boolean(v.deadline);

  return (
    <div className="space-y-6 pb-8">
      <div
        className={`sticky top-0 z-30 -mx-3 bg-slate-50/90 px-3 backdrop-blur-md sm:-mx-0 sm:bg-transparent sm:backdrop-blur-none ${isRefreshing ? 'mb-1 py-0.5' : 'py-0'}`}
      >
        <RefreshIndicator active={isRefreshing} />
      </div>
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to dashboard
          </Link>
          <h1 className="mt-3 break-words text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {v.title}
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1">
              <Building2 className="h-4 w-4 text-slate-400" aria-hidden />
              {v.client}
            </span>
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="rounded-xl bg-slate-900 px-3 py-1.5 text-sm font-bold tabular-nums text-white">
              {v.bidFitScore}
              <span className="pl-1 text-slate-400">/100</span>
            </span>
            <Badge recommendation={v.recommendation}>{recommendationLabel(v.recommendation)}</Badge>
            <Badge confidence={v.confidence}>{confidenceLabel(v.confidence)}</Badge>
            <Badge risk={v.riskLevel}>Risk: {riskLabel(v.riskLevel)}</Badge>
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/90 to-white p-6 shadow-card sm:p-8">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-brand-600" aria-hidden />
          <h2 className="text-lg font-semibold text-slate-900">Decision summary</h2>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Short explanation from the analysis. Read it alongside the details below.
        </p>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
          {displayText(v.reasoning, 'No explanation was saved for this tender.')}
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card sm:p-8">
          <h2 className="text-lg font-semibold text-slate-900">What to do next</h2>
          <p className="mt-2 text-xs text-slate-500">Practical first step for your team.</p>
          <p className="mt-3 text-sm leading-relaxed text-slate-700">{v.nextBestAction}</p>
        </section>
        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card sm:p-8">
          <h2 className="text-lg font-semibold text-slate-900">Key details</h2>
          <p className="mt-2 text-xs text-slate-500">Pulled from the tender text.</p>
          <dl className="mt-4 grid gap-3 text-sm">
            <div className="flex gap-2">
              <Tag className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <div>
                <dt className="font-medium text-slate-500">Category</dt>
                <dd className="text-slate-900">{v.category}</dd>
              </div>
            </div>
            <div className="flex gap-2">
              <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <div>
                <dt className="font-medium text-slate-500">Deadline</dt>
                <dd className="text-slate-900">{formatDeadlineLabel(v.deadline)}</dd>
              </div>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Submission method</dt>
              <dd className="text-slate-900">{v.submissionMethod}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">CPO requirement</dt>
              <dd className="text-slate-900">{v.cpoRequirement}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Urgency</dt>
              <dd className="text-slate-900 capitalize">{v.urgencyLevel}</dd>
            </div>
          </dl>
        </section>
      </div>

      <CompanyFit
        matchedServices={v.companyFit.matchedServices}
        unmatchedRequirements={v.companyFit.unmatchedRequirements}
        fitExplanation={v.companyFit.fitExplanation}
      />

      <RiskFlags flags={v.riskFlags} />

      <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card sm:p-8">
        <h2 className="text-lg font-semibold text-slate-900">Gaps to confirm</h2>
        <p className="mt-1 text-sm text-slate-600">
          Double-check these before you finally decide to bid.
        </p>
        <ul className="mt-4 list-inside list-decimal space-y-2 text-sm text-slate-700">
          {v.missingInformation.length ? (
            v.missingInformation.map((line, i) => (
              <li key={i} className="marker:font-semibold marker:text-brand-600">
                {line}
              </li>
            ))
          ) : (
            <li className="list-none text-slate-500">Nothing extra was flagged from the text.</li>
          )}
        </ul>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <TextListCard
          title="Required documents"
          description="What to include in your submission packet."
          items={v.requirements.requiredDocuments}
          emptyLabel="Nothing found in the tender text."
          icon={FileText}
        />
        <TextListCard
          title="Eligibility criteria"
          description="Rules you must meet to qualify."
          items={v.requirements.eligibilityCriteria}
          emptyLabel="Nothing found in the tender text."
          icon={ListTree}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <TextListCard
          title="Financial requirements"
          description="Bonds, prices, fees, or payment terms mentioned in the notice."
          items={v.requirements.financialRequirements}
          emptyLabel="Nothing found in the tender text."
        />
        <TextListCard
          title="Technical requirements"
          description="Scope, standards, samples, or delivery expectations."
          items={v.requirements.technicalRequirements}
          emptyLabel="Nothing found in the tender text."
        />
      </div>

      <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card sm:p-8">
        <h2 className="text-lg font-semibold text-slate-900">Checklist</h2>
        <p className="mt-1 text-sm text-slate-600">
          Tasks from this tender. Changes save automatically and show up in the activity list below.
        </p>
        <div className="mt-4">
          <Checklist
            tenderId={id}
            items={v.checklistItems}
            onUpdated={() => load({ silent: true })}
          />
        </div>
      </section>

      <AutomationPanel
        tenderId={id}
        hasDeadline={hasDeadline}
        onAfterAction={() => load({ silent: true })}
      />

      <AgentActionLog
        actions={v.agentActionLogs}
        title="Activity log"
        subtitle="Emails, reminders, analysis steps, and other events for this tender."
      />

      <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card sm:p-8">
        <h2 className="text-lg font-semibold text-slate-900">Notifications</h2>
        <p className="mt-1 text-sm text-slate-600">Emails and alerts tied to this tender.</p>
        {!v.notificationLogs.length ? (
          <p className="mt-4 text-sm text-slate-500">No notifications yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-100">
            {v.notificationLogs.map((n) => (
              <li key={n.id} className="px-4 py-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-slate-900">{n.type || 'notification'}</span>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold capitalize text-slate-700">
                    {n.status}
                  </span>
                </div>
                {n.subject && <p className="mt-1 text-slate-600">{n.subject}</p>}
                {n.recipient && (
                  <p className="mt-1 text-xs text-slate-500">To: {n.recipient}</p>
                )}
                {n.message && (
                  <p className="mt-1 text-xs text-slate-500 line-clamp-2">{n.message}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
