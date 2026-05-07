'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ClipboardList,
  FileStack,
  LayoutList,
  Timer,
  AlertOctagon,
  CalendarClock,
  ListTodo,
  Bot,
  Mail,
  Zap,
} from 'lucide-react';
import { extractApiErrorMessage, getDashboardStats, runDeadlineCheck } from '@/lib/api';
import { StatCard } from '@/components/StatCard';
import { TenderCard } from '@/components/TenderCard';
import { EmptyState } from '@/components/EmptyState';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { RefreshIndicator } from '@/components/RefreshIndicator';
import { Button } from '@/components/Button';
import { AgentActionLog } from '@/components/AgentActionLog';
import { useToast } from '@/components/ToastProvider';

export default function DashboardPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deadlineBusy, setDeadlineBusy] = useState(false);

  const load = useCallback(
    async (options = {}) => {
      const silent = options.silent === true;
      if (silent) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      try {
        if (!silent) setLoadError(null);
        const data = await getDashboardStats();
        setStats(data);
      } catch (e) {
        const msg = extractApiErrorMessage(e);
        if (!silent) setLoadError(msg);
        showToast(msg, 'error');
      } finally {
        if (silent) {
          setIsRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [showToast],
  );

  useEffect(() => {
    load({ silent: false });
  }, [load]);

  const handleDeadlineCheck = async (e) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }
    if (deadlineBusy) return;

    setDeadlineBusy(true);
    try {
      const data = await runDeadlineCheck();
      showToast(
        `Deadline check finished: looked at ${data?.checkedTenders ?? 0} tender(s), handled ${data?.remindersGenerated ?? 0} reminder(s).`,
        'success',
      );
      await load({ silent: true });
    } catch (err) {
      showToast(extractApiErrorMessage(err), 'error');
    } finally {
      setDeadlineBusy(false);
    }
  };

  if (loading && !stats) {
    return (
      <LoadingSpinner
        label="Loading dashboard…"
        hint="Getting your tenders, numbers, and recent activity."
      />
    );
  }

  if (!loading && !stats && loadError) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-amber-200 bg-amber-50/80 px-6 py-14 text-center shadow-card sm:py-16">
        <p className="text-base font-semibold text-slate-900">Dashboard could not load</p>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-700">{loadError}</p>
        <p className="mt-3 max-w-md text-xs text-slate-600">
          Start the API (usually port 5000), confirm{' '}
          <code className="rounded bg-white/80 px-1 py-0.5 text-slate-800">NEXT_PUBLIC_API_BASE_URL</code>{' '}
          in <code className="rounded bg-white/80 px-1 py-0.5">frontend/.env</code>, then retry.
        </p>
        <Button type="button" className="mt-6" onClick={() => load({ silent: false })}>
          Retry
        </Button>
      </div>
    );
  }

  const recent = stats?.recentTenders ?? [];
  const activity = stats?.recentAgentActions ?? [];
  const hasTenders = (stats?.totalTenders ?? 0) > 0;

  return (
    <div className="space-y-6 pb-6">
      <div
        className={`sticky top-0 z-30 -mx-3 bg-slate-50/90 px-3 backdrop-blur-md sm:-mx-4 sm:px-0 lg:static lg:z-auto lg:bg-transparent lg:backdrop-blur-none ${isRefreshing ? 'mb-1 py-0.5' : 'mb-0 py-0'}`}
      >
        <RefreshIndicator active={isRefreshing} />
      </div>

      <header className="border-b border-slate-200/60 pb-3 lg:hidden">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Dashboard</h1>
      </header>

      <header className="hidden border-b border-slate-200/60 pb-4 lg:block">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
      </header>

      <section className="rounded-2xl border border-slate-100 bg-gradient-to-r from-brand-50/90 to-white p-5 shadow-card sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-brand-900">Automations</h2>
            <p className="mt-1 text-sm text-slate-600">
              Check all tenders for upcoming deadlines at once. You can also run this from any tender
              page.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              type="button"
              variant="secondary"
              disabled={deadlineBusy || isRefreshing}
              onClick={handleDeadlineCheck}
            >
              {deadlineBusy ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
                  Running scan…
                </span>
              ) : (
                'Run deadline scan'
              )}
            </Button>
            <Button
              type="button"
              className="w-full sm:w-auto"
              disabled={deadlineBusy}
              onClick={() => router.push('/analyze')}
            >
              Analyze tender
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total tenders"
          value={stats?.totalTenders ?? 0}
          icon={FileStack}
          hint="All tenders you have saved here."
          accent="brand"
        />
        <StatCard
          label="Good fit"
          value={stats?.proceedCount ?? 0}
          icon={LayoutList}
          hint="Tenders where bidding looks promising."
          accent="emerald"
        />
        <StatCard
          label="Mixed fit"
          value={stats?.cautionCount ?? 0}
          icon={Timer}
          hint="Worth a look, but check risks first."
          accent="amber"
        />
        <StatCard
          label="Poor fit"
          value={stats?.doNotBidCount ?? 0}
          icon={AlertOctagon}
          hint="Tenders the model suggests skipping."
          accent="red"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="High risk tenders"
          value={stats?.highRiskCount ?? 0}
          icon={AlertOctagon}
          accent="red"
        />
        <StatCard
          label="Upcoming deadlines"
          value={stats?.upcomingDeadlines ?? 0}
          icon={CalendarClock}
          hint="Deadlines from today on."
          accent="brand"
        />
        <StatCard
          label="Pending checklist items"
          value={stats?.pendingChecklistItems ?? 0}
          icon={ListTodo}
          accent="amber"
        />
        <StatCard
          label="Completed checklist items"
          value={stats?.completedChecklistItems ?? 0}
          icon={ClipboardList}
          accent="emerald"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Automation steps"
          value={stats?.totalAgentActions ?? 0}
          icon={Bot}
          hint="Steps the tool recorded (analysis, emails, reminders, and similar)."
          accent="brand"
        />
        <StatCard
          label="Emails sent"
          value={stats?.emailsSent ?? 0}
          icon={Mail}
          hint="Summaries sent by email (or shown as a preview if sending is off)."
          accent="emerald"
        />
        <StatCard
          label="Calendar reminders"
          value={stats?.calendarRemindersCreated ?? 0}
          icon={Zap}
          hint="Calendar entries or links created from deadlines."
          accent="amber"
        />
      </div>

      <AgentActionLog
        actions={activity}
        title="Recent activity"
        subtitle="What the tool did lately across your tenders."
        showTenderLink
      />

      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Recent tenders</h2>
            <p className="text-sm text-slate-600">Open tenders you looked at most recently.</p>
          </div>
          <Button type="button" size="sm" onClick={() => router.push('/analyze')}>
            Analyze tender
          </Button>
        </div>

        {!hasTenders ? (
          <EmptyState
            title="No tenders yet."
            description="Analyze a tender to see it here."
            actionLabel="Analyze tender"
            onAction={() => router.push('/analyze')}
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {recent.map((t) => (
              <TenderCard key={t.id} tender={t} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
