'use client';

import { useState } from 'react';
import { CalendarPlus, Mail, Timer } from 'lucide-react';
import { Button } from '@/components/Button';
import {
  createCalendarReminder,
  extractApiErrorMessage,
  runDeadlineCheck,
  sendTenderEmail,
} from '@/lib/api';
import { useToast } from '@/components/ToastProvider';

export function AutomationPanel({ tenderId, hasDeadline, onAfterAction }) {
  const { showToast } = useToast();
  const [calendarBusy, setCalendarBusy] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);
  const [deadlineBusy, setDeadlineBusy] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailPreview, setEmailPreview] = useState(null);
  const [calendarUrl, setCalendarUrl] = useState(null);
  const [deadlineSummary, setDeadlineSummary] = useState(null);

  const handleCalendar = async () => {
    if (!tenderId) return;
    setCalendarBusy(true);
    setCalendarUrl(null);
    try {
      const result = await createCalendarReminder(tenderId);
      const url = result?.calendarLink || result?.link;
      if (url) setCalendarUrl(url);
      if (result?.warning) {
        showToast(result.warning, 'info');
      } else if (result?.mode === 'fallback') {
        showToast(
          'Calendar link ready—open Google Calendar and tap Save on the draft if it asks you to.',
          'info',
        );
      } else {
        showToast('Saved to the Google calendar linked to your account.', 'success');
      }
      onAfterAction?.();
    } catch (e) {
      showToast(extractApiErrorMessage(e), 'error');
    } finally {
      setCalendarBusy(false);
    }
  };

  const handleEmail = async (e) => {
    e.preventDefault();
    if (!tenderId) return;
    const to = emailTo.trim();
    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      showToast('Please enter a valid email address.', 'info');
      return;
    }
    setEmailBusy(true);
    setEmailPreview(null);
    try {
      const outcome = await sendTenderEmail(tenderId, to);
      if (outcome?.preview) setEmailPreview(outcome.preview);
      showToast(
        outcome?.status === 'sent'
          ? 'Summary sent.'
          : outcome?.message || 'Summary prepared. Check the preview below if you see one.',
        'success',
      );
      onAfterAction?.();
    } catch (err) {
      showToast(extractApiErrorMessage(err), 'error');
    } finally {
      setEmailBusy(false);
    }
  };

  const handleDeadlineCheck = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    if (deadlineBusy) return;

    setDeadlineBusy(true);
    setDeadlineSummary(null);
    try {
      const data = await runDeadlineCheck();
      setDeadlineSummary(data);
      showToast(
        `Deadline check finished: looked at ${data?.checkedTenders ?? 0} tender(s), handled ${data?.remindersGenerated ?? 0} reminder(s).`,
        'success',
      );
      onAfterAction?.();
    } catch (err) {
      showToast(extractApiErrorMessage(err), 'error');
    } finally {
      setDeadlineBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card sm:p-8">
      <h2 className="text-lg font-semibold text-slate-900">Automations</h2>
      <p className="mt-1 text-sm leading-relaxed text-slate-600">
        Add a calendar item, email a summary, or run a deadline check for all tenders. What actually
        happens depends on how your email and calendar are set up.
      </p>

      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <CalendarPlus className="h-4 w-4 text-brand-600" aria-hidden />
            Calendar
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-slate-600">
            Save the deadline to your calendar or open a draft you can finish in Google Calendar (depends
            on your setup).
          </p>
          <Button
            type="button"
            variant="secondary"
            className="mt-4 w-full"
            disabled={calendarBusy || !tenderId || !hasDeadline}
            onClick={handleCalendar}
          >
            {calendarBusy ? 'Preparing…' : 'Add to calendar'}
          </Button>
          {!hasDeadline && tenderId && (
            <p className="mt-2 text-xs text-amber-800">
              There is no deadline on this tender yet. Add one from the source text so calendar actions
              can use it.
            </p>
          )}
          {calendarUrl && (
            <a
              href={calendarUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex text-sm font-semibold text-brand-600 underline-offset-2 hover:underline"
            >
              Open in Google Calendar
            </a>
          )}
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Mail className="h-4 w-4 text-brand-600" aria-hidden />
            Email summary
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-slate-600">
            Send a short summary by email. If sending is turned off, you will see a preview here
            instead.
          </p>
          <form onSubmit={handleEmail} className="mt-4 flex flex-col gap-2">
            <label htmlFor="auto-email" className="sr-only">
              Recipient email address
            </label>
            <input
              id="auto-email"
              type="email"
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
              placeholder="recipient@company.com"
              autoComplete="email"
              disabled={!tenderId}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
            <Button type="submit" disabled={emailBusy || !tenderId} className="w-full">
              {emailBusy ? 'Sending…' : 'Send summary'}
            </Button>
          </form>
          {emailPreview && (
            <details className="mt-3 rounded-xl border border-slate-200 bg-white">
              <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-slate-800">
                Message preview
              </summary>
              <div className="border-t border-slate-100 px-3 py-2">
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Subject</p>
                <p className="text-xs text-slate-900">{emailPreview.subject}</p>
                <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  Body
                </p>
                <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-2 text-[11px] text-slate-800">
                  {emailPreview.text}
                </pre>
              </div>
            </details>
          )}
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Timer className="h-4 w-4 text-brand-600" aria-hidden />
            Deadline scan
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-slate-600">
            Scan every tender for deadlines in the time window you use in settings, then apply your
            reminder rules.
          </p>
          <Button
            type="button"
            variant="secondary"
            className="mt-4 w-full"
            disabled={deadlineBusy}
            onClick={handleDeadlineCheck}
          >
            {deadlineBusy ? (
              <span className="inline-flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
                Running scan…
              </span>
            ) : (
              'Run deadline scan'
            )}
          </Button>
          {deadlineSummary && (
            <p className="mt-3 text-xs leading-relaxed text-slate-700">
              <strong>{deadlineSummary.checkedTenders}</strong> tender(s) checked ·{' '}
              <strong>{deadlineSummary.remindersGenerated}</strong> reminder(s)
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
