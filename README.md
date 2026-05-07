# TenderPilot AI

## 1. Project overview

**TenderPilot AI** is an **AI Bid/Tender Manager Agent** for **printing, advertising, and procurement** service companies. It ingests tender notice text, produces a **structured bid decision** (score, recommendation, risks, checklist), persists everything to a database, and automates **email summaries**, **Google Calendar deadlines**, **deadline sweeps**, and an **audit-style agent action log**—demonstrating end-to-end **AI automation**, not conversational UI alone.

---

## 2. Problem statement

Tender management is **repetitive**, **document-heavy**, **deadline-sensitive**, and **revenue-critical**. Teams juggle long notices, mandatory documents, eligibility rules, and submission channels. Typical failure modes:

- Misread or missed **requirements** and **deadlines**
- Poor **bid/no-bid** discipline on weak-fit opportunities
- Tacit knowledge stuck in chat and email instead of **actionable tasks**

Companies can **miss opportunities** or waste capacity on bids they should decline.

---

## 3. Chosen role and industry

- **Role:** Bid/Tender Manager  
- **Industry:** Printing, advertising, and procurement-related services  

---

## 4. Why this role was chosen

A Bid/Tender Manager is a strong **AI + automation** use case because much of the work is **structured extraction and orchestration**:

- Reads long tender notices and **extracts** deadlines, submission methods, and mandatory documents  
- **Compares** scope to **company capabilities**  
- **Scores** fit and proposes **bid / caution / no-bid**  
- Builds **execution checklists** and tracks completion  
- **Communicates** summaries and **deadlines** (email + calendar)  
- **Runs** proactive **deadline checks** and reminders  

The product reflects that workflow in software.

---

## 5. Key features

- **AI tender analysis** (Google **Gemini**; deterministic **mock** when configured or when no API key)  
- **Requirement extraction** (documents, eligibility, financial, technical)  
- **Company fit matching** vs configurable company profile  
- **Bid fit scoring** (0–100) and **bid/no-bid style** recommendation  
- **Risk flags** and **missing information** detection  
- **Checklist generation** and **checklist tracking** (`pending` / `completed`)  
- **Email summary automation** (**SendGrid** or **mock preview**)  
- **Google Calendar** event creation (**API**) or **template link fallback**  
- **Deadline reminder check** (manual API + optional **cron**)  
- **Agent action log** (auditable automation trail)  
- **Dashboard stats** (recommendations, risk, deadlines, checklist counts, recent activity)  

---

## 6. AI automation workflow

1. User pastes **tender text** (and optional **company profile** fields) in the UI.  
2. Backend calls **Gemini** (or **mock**) and validates **strict JSON**.  
3. Server persists a **structured tender record** plus related tables (requirements, risks, checklist, company fit, gaps).  
4. **Agent actions** are logged (analyzed, extracted, scored, risks, checklist).  
5. User triggers **email** and/or **calendar** from the **Automation** panel; optional **deadline sweep** sends or previews reminders.  
6. **Dashboard** and **agent logs** reflect outcomes.  

---

## 7. Tech stack

**Frontend**

- **Next.js** (App Router)  
- **Tailwind CSS**  
- **JavaScript**  
- **Axios**  
- **Lucide** icons  

**Backend**

- **Node.js**  
- **Express.js**  
- **Prisma**  
- **SQLite**  
- **Gemini API** (`@google/generative-ai`)  
- **SendGrid**  
- **Google Calendar API** (`googleapis`)  
- **node-cron**  

---

## 8. Architecture overview

- **Frontend** — Dashboard, Analyze Tender, and per-tender **Agent Workspace** (`/tenders/[id]`), calling the REST API via `frontend/lib/api.js`.  
- **Backend API** — Express routes under `/api/...`, Zod validation, unified JSON envelopes.  
- **AI service** — `gemini.service.js`: prompt + schema validation + mock path.  
- **Email service** — `email.service.js`: HTML/text summaries.  
- **Calendar service** — `calendar.service.js`: OAuth insert or web template URL.  
- **Deadline/reminder services** — `deadlineCheck.service.js` (manual sweep), `reminder.service.js` (cron).  
- **Database** — Prisma ORM → SQLite (`prisma/schema.prisma`).  

---

## 9. Setup instructions

1. **Clone** this repository.  
2. **Backend:** install deps, configure env, run Prisma, start API.  
3. **Frontend:** install deps, configure `NEXT_PUBLIC_API_BASE_URL`, start Next.js.  
4. Ensure **`FRONTEND_URL`** on the backend matches the origin where the Next.js app runs (default `http://localhost:3000`) so **CORS** succeeds.  

---

## 10. Environment variables

- **Backend:** copy `backend/.env.example` → `backend/.env`  
- **Frontend:** copy `frontend/.env.local.example` → `frontend/.env.local`  

See inline comments in the example files. Never commit real secrets.

---

## 11. Running the project

**Backend:**

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

If you are scaffolding migrations from scratch with an empty history, you can use `npx prisma migrate dev --name init` once; **this repo already includes migrations**, so normally `migrate dev` applies existing files.

**Frontend:**

```bash
cd frontend
npm install
npm run dev
```

- API: **http://localhost:5000**  
- App: **http://localhost:3000**  

---

## 12. Demo flow

1. Open the **dashboard**.  
2. Go to **Analyze Tender**, use the **sample tender** (or paste ≥ 50 characters).  
3. Run **Analyze with AI** and review score, recommendation, risks, fit, checklist.  
4. Open the **tender workspace** for that record.  
5. Mark a **checklist** item complete.  
6. **Send email summary** (real SendGrid or mock preview).  
7. **Create calendar** event or open the **template link**.  
8. **Run deadline check** from the automation panel.  
9. Inspect **agent action logs** (and notification logs on the tender).  
10. Return to the **dashboard** and confirm stats / recent activity.  

---

## 13. API overview

| Method | Path | Description |
| ------ | ---- | ----------- |
| `GET` | `/health` | Health check |
| `POST` | `/api/tenders/analyze` | Analyze and persist tender |
| `GET` | `/api/tenders` | List tenders (optional filters) |
| `GET` | `/api/tenders/:id` | Tender detail |
| `PATCH` | `/api/tenders/:id/checklist/:itemId` | Update checklist status |
| `POST` | `/api/tenders/:id/email` | Email summary |
| `POST` | `/api/tenders/:id/calendar` | Calendar event or template link |
| `POST` | `/api/agent/run-deadline-check` | Manual deadline sweep |
| `GET` | `/api/dashboard/stats` | Dashboard aggregates |
| `DELETE` | `/api/tenders/:id` | Delete tender |

Details: **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)**.

---

## 14. Demo / mock / fallback modes

- **Gemini:** Uses **mock analysis** if `GEMINI_API_KEY` is empty or `ENABLE_MOCK_AI=true`. Optional `GEMINI_SILENT_FALLBACK` controls whether live failures fall back to mock (see `backend/.env.example`).  
- **Email:** Real send when `ENABLE_EMAIL=true` and SendGrid is configured; otherwise **`mock_sent`** with **preview** text.  
- **Calendar:** **API** mode when `ENABLE_CALENDAR=true` and OAuth fields are set; otherwise **template URL** (and if the API errors, template link is still returned with a warning).  
- **Deadlines:** **Manual** `run-deadline-check` for demos; **cron** at 09:00 local server time when reminders are enabled.  

---

## 15. Future improvements

- **PDF** tender upload and parsing  
- **Tender portal** monitoring / ingestion  
- **Team assignment** and ownership  
- **Approval workflow** before bid submission  
- **Proposal draft** generation from structured fields  
- **Multi-company** profiles and learning from outcomes  
- **E-procurement** portal integrations  

---

## Documentation index

| Document | Purpose |
| -------- | ------- |
| [SOLUTION_DESIGN.md](./SOLUTION_DESIGN.md) | Assignment-style solution / functional design |
| [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) | REST API reference |
| [DEMO_SCRIPT.md](./DEMO_SCRIPT.md) | Video / live demo script |
| [TEST_CHECKLIST.md](./TEST_CHECKLIST.md) | Pre-flight verification |
| [SUBMISSION_NOTES.md](./SUBMISSION_NOTES.md) | Submission checklist + email template |
| [backend/README.md](./backend/README.md) | Backend setup and troubleshooting |
| [frontend/README.md](./frontend/README.md) | Frontend setup and pages |
