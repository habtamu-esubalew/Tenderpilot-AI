//****** UI format helpers **************//

export function formatDeadline(value) {
  if (value == null || value === '') return null;
  try {
    const d = typeof value === 'string' ? new Date(value) : value;
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return null;
  }
}

export function formatDeadlineLabel(value, fallback = 'Not specified') {
  return formatDeadline(value) || fallback;
}

export function recommendationLabel(rec) {
  switch (rec) {
    case 'proceed':
      return 'Good fit';
    case 'proceed_with_caution':
      return 'Mixed fit';
    case 'do_not_bid':
      return 'Poor fit';
    default:
      return rec ? String(rec).replace(/_/g, ' ') : '—';
  }
}

export function bidFitTier(score) {
  if (score >= 80) return { tier: 'strong', label: 'Strong fit' };
  if (score >= 50) return { tier: 'caution', label: 'Moderate fit' };
  return { tier: 'weak', label: 'Low fit' };
}

export function riskLabel(risk) {
  if (!risk) return '—';
  return risk.charAt(0).toUpperCase() + risk.slice(1);
}

export function confidenceLabel(c) {
  if (!c) return 'Not specified';
  const s = String(c);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function displayText(v, fallback = 'Not specified') {
  if (v == null || v === '') return fallback;
  return String(v);
}

export function formatDateTimeShort(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}
