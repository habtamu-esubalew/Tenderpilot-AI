# TenderPilot AI Solution Design

## 1. Objective

Deliver a **full-stack AI automation** assignment that goes beyond a chatbot: a **Bid/Tender Manager Agent** that turns raw tender text into **persisted, structured decisions**, **execution tasks**, and **real integrations** (email, calendar, deadline sweeps) with an **auditable agent log**.

**TenderPilot AI** implements that objective for **printing, advertising, and procurement** contexts: users paste a notice, receive analysis and scoring, manage checklists, trigger automations, and review portfolio metrics.

---

## 2. Role chosen

**Bid / Tender Manager**

---

## 3. Industry chosen

**Printing, advertising, and procurement services** (company profile and prompts default to a regional print/advertising supplier; the model is instructed to reason about that domain).

---

## 4. Why this role

Tender desks repeat the same high-stakes pattern: **intake → read → qualify → decide → plan → remind → communicate**. Much of this is **pattern recognition and structured extraction** paired with **workflow**—a good fit for **LLM + rules + integrations**, while keeping humans accountable for bid approval.

---

## 5. Human role breakdown

| Human activity | TenderPilot analogue |
| -------------- | -------------------- |
| Tender discovery / intake | **Manual paste** of notice text (portal scraping **out of scope**) |
| Reading & requirement extraction | **Gemini** JSON contract → Prisma rows (documents, eligibility, financial, technical) |
| Eligibility review | Surfaced as lists + risk flags + missing info |
| Company fit evaluation | **CompanyFit** vs configurable profile |
| Bid / no-bid decision | **bidFitScore** + **recommendation** enum + reasoning narrative |
| Document checklist preparation | AI-generated **ChecklistItem** rows |
| Deadline management | **deadline** on tender + calendar + reminders |
| Stakeholder communication | **Email** summary automation |
| Reminder / follow-up | **cron** + **manual deadline check** + notification logs |

---

## 6. Prioritized workflows

**Priority 1 — Core agent**

- AI analysis (`POST /api/tenders/analyze`)  
- Requirement extraction (normalized child tables + JSON plan on tender)  
- Bid scoring / recommendation (`bidFitScore`, `recommendation`, `riskLevel`)  
- Risk detection (`RiskFlag`, missing information rows)  
- Checklist generation (`ChecklistItem`)  

**Priority 2 — Automation**

- Email summary (`email.service.js` + `NotificationLog`)  
- Calendar event (`calendar.service.js` → API or URL template)  
- Deadline reminder sweep (`deadlineCheck.service.js`, `reminder.service.js`)  

**Priority 3 — Visibility**

- Dashboard stats (`GET /api/dashboard/stats`)  
- Agent action log (`AgentActionLog` + UI)  
- Future: PDF ingestion, portals, SSO (documented only)  

---

## 7. AI agent responsibilities

The **LLM agent** (Gemini prompt in `gemini.service.js`) is responsible for:

- Reading tender text and returning **validated JSON only** (`geminiAnalysisSchema`)  
- Producing **tenderSummary** metadata (deadline nullable; no invented dates—prompt instructs honesty)  
- Comparing tender to **company profile** (**companyFit**)  
- Emitting **decision.bidFitScore** and **recommendation**  
- Recording **riskFlags** and **missingInformation**  
- Emitting execution **checklist** and **nextBestAction**  
- Producing an **automationPlan** hint object (stored on `Tender.automationPlan` as serialized JSON)

The **application** persists results, computes agent logs after save, and performs **Side-effect automations** (email/calendar/reminders) when the user triggers them or cron runs—those are **not** LLM-owned network calls.

---

## 8. Functional requirements

**Frontend**

- Dashboard with KPI cards, recent tenders, recent agent activity (`app/page.jsx`)  
- Analyze page with profile form, raw text, sample loader, rich result/report (`app/analyze/page.jsx`)  
- Tender workspace combining decision panels, risks, checklist, automation, logs (`app/tenders/[id]/page.jsx`)  
- Client uses **Axios** (`frontend/lib/api.js`) and handles network/timeout errors cleanly  

**Backend**

- REST API with envelopes `{ success, message, data/errors }`  
- Tender CRUD: analyze-create, list, get, delete  
- Checklist patch  
- Calendar + email + manual deadline sweep + dashboard aggregates  
- Zod validators for payloads  
- Persistence via Prisma; SQLite datasource  

---

## 9. Automation actions

| Action | Behavior |
| ------ | -------- |
| **Email summary** | Builds HTML/text from tender relations; sends via SendGrid when enabled; otherwise `mock_sent` + preview (`email.service.js`) |
| **Google Calendar** | Inserts event via OAuth refresh token flow when configured; falls back to **Google Calendar template URL** |
| **Deadline reminder check** | `runManualDeadlineCheck` scans a **±2-day from today window** (`deadlineCheck.service.js`), logs agent actions, emails `DEFAULT_NOTIFICATION_EMAIL` when set |
| **Agent action log** | `AgentAction.service.js` persists typed steps (`tender_analyzed`, `email_summary_sent`, `deadline_reminder_dispatched`, etc.) |

**Scheduled reminders:** `reminder.service.js` registers **cron** `0 9 * * *` when `ENABLE_REMINDERS !== false`.

---

## 10. High-level architecture

```
Next.js SPA  --HTTP JSON-->  Express API
                                  |
           +----------------------+----------------------+
           |                      |                      |
    gemini.service         email.service         calendar.service
           |                      |                      |
     Google Gemini            SendGrid            Google Calendar API
           |
    deadlineCheck.service  +  reminder.service (cron)
           |
        Prisma  -->  SQLite
```

---

## 11. Frontend design

- **Dashboard** (`/`) — stats from `/api/dashboard/stats`, links into tenders  
- **Analyze Tender** (`/analyze`) — calls `POST /api/tenders/analyze`, renders `AnalysisResult`  
- **Tender Agent Workspace** (`/tenders/[id]`) — merges nested API shape via `lib/tenderView.js` helpers; shows **CompanyFit**, **RiskFlags**, checklist, automation, logs  
- **Automation panel** — email field, buttons for calendar + deadline sweep (`AutomationPanel.jsx`)  
- **Agent Action Log** — `AgentActionLog.jsx` renders `agentActionLogs` from tender detail  

---

## 12. Backend design

| Area | Responsibility |
| ---- | -------------- |
| **Express API** (`app.js`, `routes/*.js`, `controllers/*.js`) | HTTP surface |
| **Prisma / SQLite** | Relational persistence; cascade deletes |
| **gemini.service.js** | Model call / mock / schema validation → persistence payload |
| **tender.service.js** | Orchestrates create, list, format, checklist patch, email/calendar wiring |
| **email.service.js** | SendGrid vs mock |
| **calendar.service.js** | OAuth client + template link |
| **deadlineCheck.service.js** | Manual sweep + logs + optional emails |
| **reminder.service.js** | Scheduled sweeps using same email builder |
| **agentAction.service.js** | Centralized log creation + action type constants |

---

## 13. Third-party APIs

| API | Use |
| --- | --- |
| **Gemini API** | Structured tender analysis JSON |
| **SendGrid** | Transactional tender summary email |
| **Google Calendar API** | Create deadline event (`events.insert`), optional |

---

## 14. Data model summary

Implemented in **`backend/prisma/schema.prisma`**:

| Model | Role |
| ----- | ---- |
| **Tender** | Core record + raw text + decision fields + automation JSON + calendar/email markers |
| **CompanyFit** | 1:1 fit explanation + matched/unmatched serialized arrays |
| **MissingInformation** | One row per gap string |
| **TenderDocumentRequirement** | Mandatory document labels |
| **EligibilityCriterion** | Eligibility bullets |
| **FinancialRequirement** | Financial clauses |
| **TechnicalRequirement** | Technical clauses |
| **ChecklistItem** | Execution tasks with category, priority, status |
| **RiskFlag** | Titled severity-scored risks |
| **NotificationLog** | Email/reminder audit trail |
| **AgentActionLog** | Typed automation lifecycle entries (`tenderId` nullable for global sweeps) |

---

## 15. Error handling and demo reliability

- **Validation** — Zod at controller boundaries; structured `errors[]` via `AppError`  
- **Mock AI mode** — No key / `ENABLE_MOCK_AI` → deterministic report for offline demos  
- **Email mock** — Clear `mock_sent` + preview payload instead of crashing  
- **Calendar fallback** — Template URL guarantees a demo path without OAuth  
- **Gemini retries** — Optional backoff for 429/503 when `GEMINI_RETRY_ON_429=true`  
- **Secrets** — Keys only via env; frontend exposes only `NEXT_PUBLIC_*`  

**Note:** Repeated calendar button clicks could create duplicate API events in strict production; acceptable for demo scope—harden later with idempotency keys.

---

## 16. Limitations

- **Manual intake** — paste-only; **no procurement portal ingestion** yet  
- **No PDF extraction** — plain text pathway only  
- **No authentication** — single-operator demo  
- **SQLite** — simple local persistence; concurrency limits versus Postgres  
- **Calendar OAuth setup** requires one-time credential exchange (refresh token pipeline)  

---

## 17. Future improvements

- OCR/PDF tenders and attachment packs  
- Portal bots / integrations with national e-procurement systems  
- Auth, RBAC, org-scoped tenders  
- Task assignment and approvals tied to checklist rows  
- RAG across past bids for clause suggestions  
- Idempotent reminder ledger to prevent duplicate mails per deadline window  
