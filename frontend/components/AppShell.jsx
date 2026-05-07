'use client';

import { AppHeader } from '@/components/AppHeader';
import { Sidebar } from '@/components/Sidebar';

export function AppShell({ children }) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-50 lg:flex-row lg:overflow-hidden">
      <Sidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:pl-64">
        <AppHeader />
        <main
          id="main-content"
          className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain scroll-smooth"
        >
          <div className="mx-auto w-full max-w-7xl px-3 pt-1 pb-5 sm:px-4 sm:pt-2 sm:pb-6 lg:px-8 lg:pt-2 lg:pb-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
