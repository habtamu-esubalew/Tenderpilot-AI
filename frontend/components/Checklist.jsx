'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Circle } from 'lucide-react';
import { updateChecklistItem, extractApiErrorMessage } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import { formatDeadlineLabel } from '@/lib/formatters';

const priorityDot = {
  high: 'bg-red-500',
  medium: 'bg-amber-500',
  low: 'bg-slate-400',
};

const categoryStyle = {
  review: 'bg-slate-100 text-slate-700',
  eligibility: 'bg-violet-50 text-violet-900',
  compliance: 'bg-indigo-50 text-indigo-800',
  production: 'bg-emerald-50 text-emerald-900',
  logistics: 'bg-sky-50 text-sky-900',
  default: 'bg-slate-100 text-slate-700',
};

export function Checklist({
  tenderId,
  items = [],
  onUpdated,
  readOnly = false,
}) {
  const { showToast } = useToast();
  const [busyId, setBusyId] = useState(null);

  const toggle = async (item, nextStatus) => {
    if (!tenderId || !item?.id) return;
    setBusyId(item.id);
    try {
      await updateChecklistItem(tenderId, item.id, nextStatus);
      onUpdated?.(item.id, nextStatus);
      showToast('Checklist saved.', 'success');
    } catch (e) {
      showToast(extractApiErrorMessage(e), 'error');
    } finally {
      setBusyId(null);
    }
  };

  if (!items.length) {
    return <p className="text-sm text-slate-500">No checklist items yet.</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => {
        const isDone = item.status === 'completed';
        const cat = String(item.category || 'review').toLowerCase();
        const catClass = categoryStyle[cat] || categoryStyle.default;
        const busy = busyId === item.id;

        return (
          <li
            key={item.id}
            className={`flex gap-3 rounded-xl border px-4 py-3 transition ${
              isDone ? 'border-emerald-100 bg-emerald-50/40' : 'border-slate-100 bg-slate-50/50'
            }`}
          >
            {readOnly ? (
              <span className="mt-0.5 shrink-0">
                {isDone ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : (
                  <Circle className="h-5 w-5 text-slate-400" />
                )}
              </span>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => toggle(item, isDone ? 'pending' : 'completed')}
                className="mt-0.5 shrink-0 text-brand-600 hover:text-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-40"
                aria-pressed={isDone}
                aria-label={isDone ? 'Mark as pending' : 'Mark as completed'}
              >
                {busy ? (
                  <span className="block h-5 w-5 animate-pulse rounded-full bg-slate-200" />
                ) : isDone ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : (
                  <Circle className="h-5 w-5 text-slate-400" />
                )}
              </button>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`text-sm font-medium ${isDone ? 'text-slate-500 line-through' : 'text-slate-900'}`}
                >
                  {item.title}
                </span>
                <span
                  className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${catClass}`}
                >
                  {item.category || 'review'}
                </span>
                <span
                  className={`inline-block h-2 w-2 rounded-full ${priorityDot[item.priority] || priorityDot.medium}`}
                  title={`Priority: ${item.priority}`}
                />
                {item.priority === 'high' && (
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600" aria-hidden />
                )}
              </div>
              {item.description && (
                <p className="mt-1 text-xs text-slate-600 line-clamp-3">{item.description}</p>
              )}
              <p className="mt-2 text-xs text-slate-500">
                Due: {formatDeadlineLabel(item.dueDate, 'Not specified')}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
