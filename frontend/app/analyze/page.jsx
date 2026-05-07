'use client';

import { useState } from 'react';
import {
  Building2,
  FileText,
  Info,
  Loader2,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { analyzeTender, extractApiErrorMessage } from '@/lib/api';
import { Button } from '@/components/Button';
import { AnalysisResult } from '@/components/AnalysisResult';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { SAMPLE_TENDER_TEXT } from '@/lib/sampleTender';
import { useToast } from '@/components/ToastProvider';

const MIN_CHARS = 50;

const DEFAULT_PROFILE = {
  companyName: 'Nova Printing and Advertising PLC',
  industry: 'Printing and Advertising',
  servicesText:
    'Printing, Branding, Advertising materials, Digital printing, Large format printing',
  location: 'Addis Ababa, Ethiopia',
};

function parseServices(text) {
  return text
    .split(/[,/\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function AnalyzePage() {
  const { showToast } = useToast();
  const [rawText, setRawText] = useState('');
  const [companyName, setCompanyName] = useState(DEFAULT_PROFILE.companyName);
  const [industry, setIndustry] = useState(DEFAULT_PROFILE.industry);
  const [servicesText, setServicesText] = useState(DEFAULT_PROFILE.servicesText);
  const [location, setLocation] = useState(DEFAULT_PROFILE.location);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const trimmedLen = rawText.trim().length;
  const meetsMinimum = trimmedLen >= MIN_CHARS;

  function handleSample() {
    setRawText(SAMPLE_TENDER_TEXT.trim());
    setError(null);
    showToast('Sample tender loaded. Edit it if you like, then run the analysis.', 'info');
  }

  function resetForAnother() {
    setResult(null);
    setError(null);
    setRawText('');
    if (typeof window !== 'undefined') {
      const main = document.getElementById('main-content');
      if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
      else window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!meetsMinimum) {
      setError(`Please paste at least ${MIN_CHARS} characters of tender text (currently ${trimmedLen}).`);
      return;
    }

    setLoading(true);
    try {
      const tender = await analyzeTender({
        rawText: rawText.trim(),
        companyProfile: {
          companyName: companyName.trim(),
          industry: industry.trim(),
          services: parseServices(servicesText),
          location: location.trim(),
        },
      });
      setResult(tender);
      showToast('Analysis saved. You can open it from the dashboard.', 'success');
      if (typeof window !== 'undefined') {
        const main = document.getElementById('main-content');
        if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
        else window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      const msg = extractApiErrorMessage(err);
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return <AnalysisResult tenderRaw={result} onAnalyzeAnother={resetForAnother} />;
  }

  const fieldClass =
    'w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60';

  return (
    <div className="space-y-6 pb-6 pt-0.5 sm:pt-1">
      <header className="border-b border-slate-200/60 pb-3 lg:hidden">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Analyze Tender</h1>
      </header>

      <header className="hidden border-b border-slate-200/60 pb-4 lg:block">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Analyze Tender</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
          Paste the tender text, add your company details, and get a clear write-up with fit, risks,
          and a task list.
        </p>
      </header>

      <div className="overflow-hidden rounded-xl border border-slate-100/90 bg-gradient-to-br from-brand-50/80 via-white to-indigo-50/30 p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-2 text-brand-800">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-brand-600 shadow-sm ring-1 ring-brand-100/80">
            <Wand2 className="h-3.5 w-3.5" aria-hidden />
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wide">AI Bid Manager</span>
        </div>
        <p className="mt-2.5 max-w-xl text-sm leading-snug text-slate-600">
          You get a{' '}
          <strong className="font-semibold text-slate-800">clear write-up</strong> with{' '}
          <strong className="font-semibold text-slate-800">what is required</strong>, how well you{' '}
          <strong className="font-semibold text-slate-800">match the job</strong>, main{' '}
          <strong className="font-semibold text-slate-800">risks</strong>, a short{' '}
          <strong className="font-semibold text-slate-800">checklist</strong>, and{' '}
          <strong className="font-semibold text-slate-800">what to do next</strong>
          —easier to use than a long chat.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-medium text-slate-600">
          <span className="inline-flex items-center gap-1 rounded-md bg-white/90 px-2 py-1 ring-1 ring-slate-100/90">
            <Sparkles className="h-3 w-3 text-brand-600" aria-hidden />
            Bid fit
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-white/90 px-2 py-1 ring-1 ring-slate-100/90">
            <Building2 className="h-3 w-3 text-brand-600" aria-hidden />
            Company fit
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-white/90 px-2 py-1 ring-1 ring-slate-100/90">
            <FileText className="h-3 w-3 text-brand-600" aria-hidden />
            Checklist
          </span>
        </div>
      </div>

      {error && (
        <div
          className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-900 shadow-card"
          role="alert"
        >
          <p className="font-semibold">Analysis failed</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8" aria-busy={loading}>
        <div className="relative rounded-2xl border border-dashed border-slate-200/80 bg-slate-50/30 p-1 lg:p-2">
          {loading && (
            <div
              className="absolute inset-0 z-20 flex min-h-[32rem] items-center justify-center rounded-2xl bg-white/80 p-6 backdrop-blur-[3px]"
              aria-live="polite"
            >
              <LoadingSpinner
                variant="panel"
                label="Analyzing your tender…"
                hint="Pulling out requirements, scoring fit, and building your checklist. This can take up to a minute."
                className="max-w-md shadow-lg"
              />
            </div>
          )}

          <div className="grid gap-8 lg:grid-cols-12 lg:gap-8 xl:gap-10">
            <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card sm:p-8 lg:col-span-7">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <FileText className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold text-slate-900">Tender notice</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    Add deadlines, how to submit, bond or pricing rules, and who can bid—copy from the
                    buyer’s documents when you can.
                  </p>
                  <label htmlFor="raw-text" className="sr-only">
                    Raw tender text
                  </label>
                  <textarea
                    id="raw-text"
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    rows={20}
                    disabled={loading}
                    placeholder="Paste tender text here…"
                    className={`${fieldClass} mt-4 min-h-[22rem] min-w-0 resize-y bg-slate-50/50 lg:min-h-[28rem]`}
                  />
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <Button type="button" variant="secondary" size="sm" disabled={loading} onClick={handleSample}>
                      Use sample tender
                    </Button>
                    <p
                      className={`text-xs font-medium tabular-nums sm:text-right ${
                        meetsMinimum ? 'text-emerald-700' : 'text-slate-500'
                      }`}
                    >
                      {trimmedLen} / {MIN_CHARS}+ characters
                      {!meetsMinimum && trimmedLen > 0 && (
                        <span className="text-amber-700"> — add more to analyze</span>
                      )}
                    </p>
                  </div>
                  <div className="mt-3 flex gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-600 ring-1 ring-slate-100">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden />
                    <span>
                      Try <strong>Use sample tender</strong> for a full example, then press{' '}
                      <strong>Analyze with AI</strong>.
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card sm:p-8 lg:col-span-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Building2 className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Company profile</h3>
                  <p className="mt-0.5 text-sm text-slate-600">
                    We compare this tender to these details to judge how well you fit.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-5">
                <div>
                  <label
                    htmlFor="co-name"
                    className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    Company name
                  </label>
                  <input
                    id="co-name"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    disabled={loading}
                    className={fieldClass}
                  />
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="co-industry"
                      className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                    >
                      Industry
                    </label>
                    <input
                      id="co-industry"
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      disabled={loading}
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="co-location"
                      className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                    >
                      Location
                    </label>
                    <input
                      id="co-location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      disabled={loading}
                      className={fieldClass}
                    />
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="co-services"
                    className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    Services (separate with commas or new lines)
                  </label>
                  <textarea
                    id="co-services"
                    value={servicesText}
                    onChange={(e) => setServicesText(e.target.value)}
                    rows={4}
                    disabled={loading}
                    className={`${fieldClass} resize-y`}
                  />
                </div>
              </div>
            </section>
          </div>
        </div>

        <div className="sticky bottom-0 z-20 -mx-3 border-t border-slate-200/90 bg-slate-50/95 px-3 pt-3 pb-[max(0.75rem,calc(0.5rem+env(safe-area-inset-bottom,0px)))] backdrop-blur-md supports-[backdrop-filter]:bg-slate-50/90 sm:-mx-0 sm:rounded-2xl sm:border sm:border-slate-100 sm:bg-white sm:px-4 sm:py-4 sm:pb-4 sm:shadow-card sm:backdrop-blur-none lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:py-4 lg:shadow-none">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500 lg:max-w-md">
              When you are done, the result is saved and listed on your dashboard.
            </p>
            <Button
              type="submit"
              size="lg"
              disabled={loading || !meetsMinimum}
              className="w-full min-w-[200px] shrink-0 sm:w-auto"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden />
                  Analyzing…
                </span>
              ) : (
                'Analyze with AI'
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
