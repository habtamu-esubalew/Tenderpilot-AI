# TenderPilot AI — Backend

Backend API for **TenderPilot AI**: a **bid/tender manager agent** (not only summarization). It parses tender notices, extracts structured requirements and risks, scores company fit, builds execution checklists, **logs every automation step** (`AgentActionLog`), optionally sends emails (SendGrid or mock preview), persists **Google Calendar** events or template links, exposes a **manual deadline sweep** for demos, and runs a daily reminder job.

## Backend features

- **Agent-style analyze flow** (`POST /api/tenders/analyze`): Gemini (or deterministic mock) returns a strict nested JSON shape; persistence includes documents, eligibility, financial/technical reqs, risk flags, **missing-information rows**, **company fit** (stored as normalized relations + JSON TEXT fields), checklist with categories, and **five agent action logs** (analyzed → extracted → scored → risks → checklist).
- **AI resilience**: no key / `ENABLE_MOCK_AI=true` → mock analysis. With a live key, transient **HTTP 429 / 503** (rate limit, “high demand”) triggers **up to 3 backoff retries** when `GEMINI_RETRY_ON_429=true`. If `GEMINI_SILENT_FALLBACK=false` (default in `.env.example`), API/parse/schema failures **surface as HTTP 502** with an actionable message instead of hiding behind mock analysis (recommended when reviewers grade real Gemini integration).
- **Calendar**: Google Calendar API when `ENABLE_CALENDAR=true` and OAuth credentials exist; otherwise a **Google Calendar template URL**. **Requires a tender deadline.** Persists `calendarLink` plus `calendarEventId` (Google id, or sentinel `google_calendar_template` when using template mode).
- **Email**: SendGrid when enabled; otherwise mock preview + `NotificationLog` + `AgentActionLog` (`email_summary_sent`).
- **Proactive automation**: `POST /api/agent/run-deadline-check` scans deadlines in the **next two days**, writes agent logs + optional reminders; cron job at **09:00** when `ENABLE_REMINDERS=true`.
- **Unified API envelopes**: `{ success, message, data }` / `{ success, message, errors }`.
- **Prisma errors** mapped to safe HTTP responses (details hidden in production for 500s).

## Tech stack

Node.js · Express · JavaScript · Prisma · SQLite · Gemini · SendGrid · Google Calendar (`googleapis`) · `node-cron` · Zod · Helmet · CORS · dotenv

## Prerequisites

- **Node.js 18+** (`npm run dev` uses `node --watch`)
- Use **`npm`** scripts for Prisma so the project stays on **Prisma 5.22.x** pinned in `package.json`. A global **`npx prisma` (v7)** will fail validation on this schema.

## Setup

```bash
cd backend
npm install
cp .env.example .env   # Windows: copy .env.example .env
```

Generate client and apply migrations (**set `DATABASE_URL` if missing in shell**):

```bash
npm run prisma:generate
npm run prisma:migrate
```

## Environment variables

| Variable | Purpose |
|----------|---------|
| `PORT` | Default `5000` |
| `DATABASE_URL` | e.g. `file:./dev.db` (optional `?busy_timeout=120000` — see `.env.example`) |
| `FRONTEND_URL` | CORS origin; must match the Next.js dev origin (`http://localhost:3000` by default) |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | Live Gemini; omit key or set `ENABLE_MOCK_AI=true` for mock analysis (default model `gemini-2.5-flash` when unset) |
| `ENABLE_MOCK_AI` | `true` forces mock even if a key is set |
| `GEMINI_SILENT_FALLBACK` | If `false` + key + mock off: Gemini errors bubble as **502** (no silent mock) |
| `GEMINI_RETRY_ON_429` | If `true` (default): retries after backoff on transient errors (429, 503 overload, etc.), up to 4 attempts |
| `SENDGRID_*`, `ENABLE_EMAIL`, `DEFAULT_NOTIFICATION_EMAIL` | Email delivery and reminder recipient |
| `GOOGLE_*`, `ENABLE_CALENDAR` | OAuth calendar inserts |
| `ENABLE_REMINDERS` | Disable daily cron with `false` |

## Run

```bash
npm run dev
# or npm start
```

- `GET http://localhost:5000/health`

## API (all under `/api` except `/health`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/tenders/analyze` | Validate body → AI → persist full graph + agent logs |
| GET | `/api/tenders` | List with optional `recommendation`, `riskLevel`, `status`, `search` |
| GET | `/api/tenders/:id` | Nested `tenderSummary` / `requirements` … **plus flat fields** compatible with older UI bindings |
| PATCH | `/api/tenders/:id/checklist/:itemId` | `status`: `pending` \| `completed` |
| POST | `/api/tenders/:id/calendar` | Deadline required; persists link + marker/id; logs `calendar_reminder_created` |
| POST | `/api/tenders/:id/email` | Validates `to`; mock or SendGrid |
| DELETE | `/api/tenders/:id` | Cascades owned children |
| GET | `/api/dashboard/stats` | Counts incl. agent actions, `emailSent=true` tenders, calendar agent actions |
| POST | `/api/agent/run-deadline-check` | Demo-friendly proactive sweep |

### Grading / scored demo (live Gemini)

Set `GEMINI_API_KEY`, `ENABLE_MOCK_AI=false`, `GEMINI_SILENT_FALLBACK=false`, and a current model id (`GEMINI_MODEL=gemini-2.5-flash` or `gemini-flash-latest`; older ids like `gemini-1.5-flash` may 404). Failed analyze calls return **502** with a human-readable upstream reason instead of silently returning mock scores.

## Demo flow (`ENABLE_MOCK_AI=true`, `ENABLE_EMAIL=false`, `ENABLE_CALENDAR=false`)

1. `POST /api/tenders/analyze` with ≥50 chars of `rawText` → persisted tender + **AgentActionLog** entries.
2. `GET /api/tenders/:id` → risk flags, missing info rows, checklist, automation plan.
3. `POST /api/tenders/:id/email` → mock preview, `NotificationLog`, `AgentActionLog`, `emailSent=true`.
4. `POST /api/tenders/:id/calendar` (needs deadline) → `calendarLink` + template marker in DB.
5. `POST /api/agent/run-deadline-check` → counts + reminder logs/mock emails when `DEFAULT_NOTIFICATION_EMAIL` set.
6. `GET /api/dashboard/stats` → KPIs incl. **`totalAgentActions`**, **`emailsSent`**, **`calendarRemindersCreated`**, **`recentAgentActions`**.

## Data model highlights

- **Tender** — core decision fields (`bidFitScore`, `recommendation`, `confidence`, `riskLevel`, `nextBestAction`, `estimatedEffort`, `urgencyLevel`, …) + `calendarEventId` / `calendarLink`.
- **CompanyFit** — 1:1 with tender; arrays stored JSON-encoded in SQLite `TEXT`.
- **MissingInformation** — one row per gap string.
- **AgentActionLog** — audit trail (`tender_analyzed`, `requirements_extracted`, …, `deadline_reminder_dispatched`).

## Troubleshooting

| Issue | Mitigation |
|-------|-------------|
| `P1012` datasource / Prisma 7 | Run **`npm install`** then **`npm run prisma:*`** — do not rely on a global Prisma 7 CLI. Optionally: `npx prisma@5.22.0 …` |
| `DATABASE_URL` not found during `validate` | Export `DATABASE_URL=file:./dev.db` or use `.env` in `backend/` |
| CORS errors from browser | Set `FRONTEND_URL` to your exact origin (scheme + host + port) |
| Calendar 400 “no deadline” | Re-analyze with clearer notice or augment pipeline to set deadlines manually |
| `P1008` / SQLite timeouts | One API process; close **Prisma Studio** during analyze if possible; raise `DATABASE_URL` `busy_timeout` (e.g. `120000`; see `.env.example`); persists agent logs outside the tender `create` txn to shorten lock duration |
| npm `ECONNRESET` / partial `node_modules` | Delete `node_modules`, retry; see `backend/.npmrc` retry settings |

## Prisma scripts

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:studio
```
