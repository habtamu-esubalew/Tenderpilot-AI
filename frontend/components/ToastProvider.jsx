'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';

const ToastContext = createContext(null);

let toastId = 0;

function ToastItem({ toast, onDismiss }) {
  const styles = {
    success: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    error: 'bg-red-50 text-red-900 border-red-200',
    info: 'bg-white text-slate-800 border-slate-200',
  };
  const Icon =
    toast.variant === 'success' ? CheckCircle2 : toast.variant === 'error' ? AlertCircle : Info;

  return (
    <div
      className={`pointer-events-auto flex max-w-[min(100vw-2rem,24rem)] items-start gap-3 rounded-xl border px-4 py-3 shadow-card-md ${styles[toast.variant] || styles.info}`}
      role="status"
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0 opacity-90" aria-hidden />
      <p className="flex-1 text-sm font-medium leading-snug">{toast.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded-lg p-1 text-current opacity-60 hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message, variant = 'info', duration = 4500) => {
      const id = ++toastId;
      setToasts((prev) => [...prev, { id, message, variant }]);
      if (duration > 0) {
        setTimeout(() => remove(id), duration);
      }
      return id;
    },
    [remove],
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className="pointer-events-none fixed bottom-0 left-0 right-0 z-50 flex flex-col items-center gap-2 p-4 pb-[max(1rem,calc(0.5rem+env(safe-area-inset-bottom,0px)))] sm:bottom-4 sm:left-auto sm:right-4 sm:items-end sm:pb-4"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
