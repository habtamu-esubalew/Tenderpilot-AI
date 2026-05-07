'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ScanSearch, Sparkles } from 'lucide-react';

const linkBase =
  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2';

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="fixed inset-y-0 left-0 z-30 hidden h-dvh w-64 flex-col border-r border-slate-200/80 bg-white shadow-[4px_0_24px_-12px_rgba(15,23,42,0.12)] lg:flex"
      aria-label="Primary navigation"
    >
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-100 px-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-700 text-white shadow-sm">
          <Sparkles className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            TenderPilot
          </p>
          <p className="truncate text-sm font-bold tracking-tight text-slate-900">AI Bid Manager</p>
        </div>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-4" aria-label="Main">
        <Link
          href="/"
          className={`${linkBase} ${
            pathname === '/'
              ? 'bg-brand-50 text-brand-900 shadow-sm ring-1 ring-brand-100'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <LayoutDashboard className="h-5 w-5 shrink-0 text-brand-600/90" />
          Dashboard
        </Link>
        <Link
          href="/analyze"
          className={`${linkBase} ${
            pathname === '/analyze'
              ? 'bg-brand-50 text-brand-900 shadow-sm ring-1 ring-brand-100'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <ScanSearch className="h-5 w-5 shrink-0 text-brand-600/90" />
          Analyze Tender
        </Link>
      </nav>

      <div className="shrink-0 border-t border-slate-100 bg-slate-50/60 p-4">
        <p className="text-[11px] leading-relaxed text-slate-500">
          Email summaries, calendar items, and deadline checks are also on each tender page.
        </p>
      </div>
    </aside>
  );
}
