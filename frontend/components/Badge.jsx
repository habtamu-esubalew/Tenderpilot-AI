const recommendationStyles = {
  proceed: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  proceed_with_caution: 'bg-amber-50 text-amber-900 ring-amber-200',
  do_not_bid: 'bg-red-50 text-red-800 ring-red-200',
};

const riskStyles = {
  low: 'bg-slate-100 text-slate-700 ring-slate-200',
  medium: 'bg-amber-50 text-amber-800 ring-amber-200',
  high: 'bg-red-50 text-red-800 ring-red-200',
};

const confidenceStyles = {
  high: 'bg-emerald-50 text-emerald-900 ring-emerald-200',
  medium: 'bg-indigo-50 text-indigo-900 ring-indigo-200',
  low: 'bg-slate-100 text-slate-700 ring-slate-200',
};

export function Badge({
  children,
  variant = 'default',
  recommendation,
  risk,
  confidence,
  className = '',
}) {
  let classes =
    'inline-flex items-center rounded-lg px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ';
  if (recommendation && recommendationStyles[recommendation]) {
    classes += recommendationStyles[recommendation];
  } else if (risk && riskStyles[risk]) {
    classes += riskStyles[risk];
  } else if (confidence && confidenceStyles[String(confidence).toLowerCase()]) {
    classes += confidenceStyles[String(confidence).toLowerCase()];
  } else {
    classes += 'bg-slate-100 text-slate-700 ring-slate-200';
  }
  return <span className={`${classes} ${className}`}>{children}</span>;
}
