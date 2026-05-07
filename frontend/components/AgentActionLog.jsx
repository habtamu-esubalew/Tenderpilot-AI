import {
  Bot,
  CalendarClock,
  CheckSquare,
  ClipboardList,
  Mail,
  Radar,
  Scale,
  Sparkles,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { formatDateTimeShort } from '@/lib/formatters';

const iconFor = (actionType) => {
  switch (actionType) {
    case 'tender_analyzed':
      return Sparkles;
    case 'requirements_extracted':
      return ClipboardList;
    case 'bid_fit_scored':
      return Scale;
    case 'risk_flags_generated':
      return Radar;
    case 'checklist_generated':
      return CheckSquare;
    case 'calendar_reminder_created':
      return CalendarClock;
    case 'email_summary_sent':
      return Mail;
    case 'deadline_check_completed':
      return Zap;
    case 'deadline_reminder_dispatched':
      return Mail;
    default:
      return Bot;
  }
};

const statusStyle = (status) => {
  const s = String(status || '').toLowerCase();
  if (s === 'completed' || s === 'sent') return 'bg-emerald-50 text-emerald-800 ring-emerald-200';
  if (s === 'failed') return 'bg-red-50 text-red-800 ring-red-200';
  if (s === 'mock') return 'bg-indigo-50 text-indigo-900 ring-indigo-200';
  return 'bg-slate-100 text-slate-700 ring-slate-200';
};

function humanStatus(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'mock') return 'Demo';
  if (s === 'completed') return 'Done';
  if (s === 'sent') return 'Sent';
  if (s === 'failed') return 'Failed';
  if (!status) return '—';
  return String(status);
}

export function AgentActionLog({ actions = [], title = 'Activity', subtitle, showTenderLink }) {
  if (!actions.length) {
    return (
      <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card sm:p-8">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="mt-2 text-sm text-slate-600">
          {subtitle || 'When you run analysis or automations, a short log will show up here.'}
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card sm:p-8">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
      <ul className="mt-5 space-y-3">
        {actions.map((a) => {
          const Icon = iconFor(a.actionType);
          return (
            <li
              key={a.id}
              className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50/40 px-4 py-3"
            >
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-brand-600 shadow-sm ring-1 ring-slate-100">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-slate-900">{a.title}</span>
                  <span
                    className={`rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${statusStyle(a.status)}`}
                  >
                    {humanStatus(a.status)}
                  </span>
                </div>
                {a.description && (
                  <p className="mt-1 text-sm text-slate-600 line-clamp-3">{a.description}</p>
                )}
                {showTenderLink && a.tender?.id && (
                  <Link
                    href={`/tenders/${a.tender.id}`}
                    className="mt-2 inline-block text-xs font-semibold text-brand-600 hover:text-brand-700"
                  >
                    View tender: {a.tender.title}
                  </Link>
                )}
                <p className="mt-2 text-xs text-slate-500">
                  {formatDateTimeShort(a.createdAt)}
                  {a.actionType ? ` · ${String(a.actionType).replace(/_/g, ' ')}` : ''}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
