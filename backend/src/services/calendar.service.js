const { google } = require('googleapis');
const { env, hasGoogleCalendarOAuth } = require('../config/env');
const { AppError } = require('../middleware/error.middleware');

//****** Google Calendar — API insert or template URL **************//

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientCalendarNetworkError(err) {
  const m = `${err.code || ''} ${err.errno || ''} ${String(err.message || err)}`;
  return /socket hang up|ECONNRESET|EPIPE|EAI_AGAIN|ETIMEDOUT|timed out/i.test(m);
}

//****** events.insert — retry transient network errors **************//

async function insertCalendarEvent(calendar, event) {
  const maxAttempts = 3;
  const timeouts = [60_000, 90_000, 120_000];
  let lastErr;

  for (let i = 0; i < maxAttempts; i += 1) {
    try {
      if (i > 0) await sleep(1500 * i);
      return await calendar.events.insert(
        { calendarId: 'primary', requestBody: event },
        { timeout: timeouts[i] ?? 120_000 },
      );
    } catch (e) {
      lastErr = e;
      if (!isTransientCalendarNetworkError(e) || i === maxAttempts - 1) {
        throw e;
      }
      console.warn(
        `[calendar] transient network error (${String(e.message || e).slice(0, 120)}) — retry ${i + 2}/${maxAttempts}`,
      );
    }
  }

  throw lastErr;
}

function formatRiskFlagsBrief(tender) {
  const flags = tender.riskFlags || [];
  if (!flags.length) return 'None recorded';
  return flags
    .map((f) => `[${f.severity}] ${f.title}`)
    .slice(0, 6)
    .join('; ');
}

function buildCalendarDescription(tender) {
  const docs = tender.requiredDocuments?.map((d) => d.name).join(', ') || '—';
  const checklistDone = tender.checklistItems?.filter((c) => c.status === 'completed').length ?? 0;
  const checklistTotal = tender.checklistItems?.length ?? 0;
  const confidence = tender.confidence || '—';
  const nextAction =
    tender.nextBestAction ||
    (tender.recommendation === 'do_not_bid'
      ? 'Archive unless strategic.'
      : 'Advance internal bid review.');

  return [
    `Title: ${tender.title}`,
    `Client: ${tender.client}`,
    `Deadline: ${tender.deadline ? tender.deadline.toISOString() : '—'}`,
    `Bid fit score: ${tender.bidFitScore}/100`,
    `Recommendation: ${tender.recommendation}`,
    `Confidence: ${confidence}`,
    `Risk level: ${tender.riskLevel}`,
    `Risk flags: ${formatRiskFlagsBrief(tender)}`,
    '',
    `Next best action: ${nextAction}`,
    '',
    'Required documents:',
    docs,
    '',
    `Checklist progress: ${checklistDone}/${checklistTotal} completed`,
  ].join('\n');
}

//****** Template URL — truncate details (length limits) **************//

const MAX_TEMPLATE_DETAILS_CHARS = 1200;

function buildGoogleCalendarWebLink({ title, description, deadline }) {
  let body = description || '';
  if (body.length > MAX_TEMPLATE_DETAILS_CHARS) {
    body = `${body.slice(0, MAX_TEMPLATE_DETAILS_CHARS - 1)}…`;
  }

  const eventTitle = encodeURIComponent(`Tender Deadline - ${title}`);
  const details = encodeURIComponent(body);
  const start = new Date(deadline);
  const end = new Date(start.getTime() + 60 * 60 * 1000);

  const fmt = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const dates = encodeURIComponent(`${fmt(start)}/${fmt(end)}`);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${eventTitle}&dates=${dates}&details=${details}`;
}

const TEMPLATE_EVENT_ID_MARKER = 'google_calendar_template';

//****** Calendar — OAuth insert vs template link **************//

async function createDeadlineEvent(tender) {
  if (!tender.deadline) {
    throw new AppError('Tender has no deadline; cannot create calendar event.', 400);
  }

  const title = `Tender Deadline - ${tender.title}`;
  const description = buildCalendarDescription(tender);
  const calendarLink = buildGoogleCalendarWebLink({
    title: tender.title,
    description,
    deadline: tender.deadline,
  });

  if (!hasGoogleCalendarOAuth()) {
    return {
      calendarEventId: null,
      calendarLink,
      mode: 'fallback',
    };
  }

  const oauth2Client = new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI,
  );

  oauth2Client.setCredentials({
    refresh_token: env.GOOGLE_REFRESH_TOKEN,
  });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const start = new Date(tender.deadline);
  const end = new Date(start.getTime() + 60 * 60 * 1000);

  const event = {
    summary: title,
    description,
    start: { dateTime: start.toISOString() },
    end: { dateTime: end.toISOString() },
  };

  try {
    const created = await insertCalendarEvent(calendar, event);

    return {
      calendarEventId: created.data.id || null,
      calendarLink: created.data.htmlLink || calendarLink,
      mode: 'api',
    };
  } catch (e) {
    console.error('[calendar] Google Calendar API insert failed:', e.message || e);
    return {
      calendarEventId: null,
      calendarLink,
      mode: 'fallback',
      warning: 'Calendar API failed; use the template link instead.',
    };
  }
}

module.exports = {
  createDeadlineEvent,
  buildGoogleCalendarWebLink,
  buildCalendarDescription,
  TEMPLATE_EVENT_ID_MARKER,
};
