import { Loader2 } from 'lucide-react';

export function LoadingSpinner({ className = '', label = 'Loading', hint, variant = 'default' }) {
  if (variant === 'compact') {
    return (
      <span className={`inline-flex items-center gap-2 text-sm text-slate-600 ${className}`} role="status">
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand-600" aria-hidden />
        <span className="font-medium">{label}</span>
      </span>
    );
  }

  if (variant === 'panel') {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-4 rounded-2xl border border-slate-100 bg-white/95 px-8 py-10 shadow-card-md backdrop-blur-sm ${className}`}
        role="status"
      >
        <div className="relative">
          <span className="absolute inset-0 rounded-full bg-brand-500/20 blur-md" aria-hidden />
          <Loader2 className="relative h-12 w-12 animate-spin text-brand-600" aria-hidden />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-900">{label}</p>
          {hint && <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-500">{hint}</p>}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 py-10 sm:py-14 ${className}`}
      role="status"
    >
      <div className="relative">
        <span className="absolute inset-0 rounded-full bg-brand-500/15 blur-xl" aria-hidden />
        <Loader2 className="relative h-11 w-11 animate-spin text-brand-600" aria-hidden />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        {hint && <p className="mt-2 max-w-sm text-xs leading-relaxed text-slate-500">{hint}</p>}
      </div>
    </div>
  );
}
