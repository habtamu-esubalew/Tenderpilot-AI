# TenderPilot AI — Frontend (Next.js)

Polished **AI Bid / Tender Manager** workspace for printing, advertising, and procurement teams: analyze notices, review structured AI decisions, manage execution checklists, and trigger **real automations** (calendar, email, deadline sweeps) with a visible **agent action log**.

## Features

- **Dashboard** — Tender counts by recommendation, risk, deadlines, checklist throughput, **agent action totals**, emails sent, calendar reminders, **recent agent activity**, recent tenders.
- **Analyze** — Rich **AI Bid Manager report** (score, recommendation, confidence, company fit, risk flags, missing info, requirements, checklist preview).
- **Tender workspace** — Full `/tenders/[id]` view: decision panel, next best action, company fit, risk flags, missing info, documents, eligibility, financial/technical requirements, checklist (PATCH), automation panel, per-tender agent log, notification log.
- **Automation** — Calendar reminder (`POST /api/tenders/:id/calendar`), email summary (`POST /api/tenders/:id/email`), **deadline check** (`POST /api/agent/run-deadline-check`).
- **UX** — Loading / error / empty states, responsive layout (mobile–desktop), toast feedback, safe handling of missing arrays/fields.

## Tech stack

- **Next.js 15** (App Router)
- **React 18**
- **Tailwind CSS**
- **Axios**
- **Lucide React**

## Prerequisites

- Node.js **18+**
- **Backend** API (default `http://localhost:5000`) — see repository backend `README`.

## Environment variables

Copy `.env.local.example` to **`.env.local`** in this folder:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
```

- Use **`NEXT_PUBLIC_`** so the browser can read the API base URL. **Do not** put secrets here.
- Backend CORS should allow the frontend origin (default backend `FRONTEND_URL` is `http://localhost:3000`).

## Setup & run

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000** (Next.js default).

```bash
npm run build
npm run start   # production
```

## Backend dependency

The UI expects `{ success, message, data }` responses and calls:

- `POST /api/tenders/analyze`
- `GET /api/tenders`, `GET /api/tenders/:id`, `DELETE /api/tenders/:id`
- `PATCH /api/tenders/:id/checklist/:itemId`
- `POST /api/tenders/:id/calendar`, `POST /api/tenders/:id/email`
- `GET /api/dashboard/stats`
- `POST /api/agent/run-deadline-check`

## Demo flow (video-ready)

1. Open **Dashboard** — stats + **Recent agent activity**.
2. **Analyze Tender** → **Use sample tender** → **Analyze with AI** (loading state).
3. Review the **report** (score, recommendation, confidence, company fit, risk flags, checklist).
4. **Open full agent workspace**.
5. Toggle **checklist** items; **Create calendar reminder**; **Send email summary**; **Run deadline check**.
6. Confirm **Agent action log** and **notification log** update; return to **Dashboard** to see refreshed stats/activity.

## Project layout

- `app/page.jsx` — Dashboard (`/`)
- `app/analyze/page.jsx` — Analyze (`/analyze`)
- `app/tenders/[id]/page.jsx` — Tender workspace
- `app/layout.jsx`, `app/globals.css`
- `components/` — UI + `AutomationPanel`, `AgentActionLog`, `CompanyFit`, `RiskFlags`, etc.
- `lib/api.js` — Axios client + API helpers
- `lib/tenderView.js` — Normalizes nested `tenderSummary` / `decision` / legacy flat fields
