'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, Sparkles } from 'lucide-react';

const mobileLink =
  'rounded-lg px-3 py-2.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';

export function AppHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const linkClass = (href) =>
    `${mobileLink} ${pathname === href ? 'bg-brand-50 text-brand-800' : 'text-slate-700 hover:bg-slate-50'}`;

  return (
    <header className="sticky top-0 z-20 shrink-0 border-b border-slate-200/80 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 lg:hidden">
      <div className="flex h-14 items-center justify-between px-4">
        <Link href="/" className="flex min-w-0 items-center gap-2" onClick={() => setOpen(false)}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white">
            <Sparkles className="h-4 w-4" aria-hidden />
          </span>
          <span className="truncate text-sm font-bold text-slate-900">TenderPilot AI</span>
        </Link>
        <button
          type="button"
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <Menu className="h-6 w-6" />
          <span className="sr-only">Menu</span>
        </button>
      </div>
      {open && (
        <nav className="border-t border-slate-100 bg-white px-3 py-3 shadow-inner" aria-label="Mobile">
          <div className="flex flex-col gap-0.5">
            <Link href="/" className={linkClass('/')} onClick={() => setOpen(false)}>
              Dashboard
            </Link>
            <Link href="/analyze" className={linkClass('/analyze')} onClick={() => setOpen(false)}>
              Analyze Tender
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
