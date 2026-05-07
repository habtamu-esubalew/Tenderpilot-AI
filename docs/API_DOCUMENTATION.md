# API Documentation

**Base URL:** `http://localhost:5000` (override with `PORT` in `backend/.env`)

**CORS:** Requests from the browser must originate from `FRONTEND_URL` (default `http://localhost:3000`).

---

## Response format

**Success:**

```json
{
  "success": true,
  "message": "string",
  "data": {}
}
```

**Error:**

```json
{
  "success": false,
  "message": "string",
  "errors": []
}
```

Validation failures (Zod) typically return **422** with `errors` as `{ "field": string, "message": string }[]`.

---

## 1. `GET /health`

**Purpose:** Liveness check for demos, monitoring, and CI.

**Response example:**

```json
{
  "success": true,
  "message": "Service healthy",
  "data": { "status": "healthy" }
}
```

---

## 2. `POST /api/tenders/analyze`

**Purpose:** Run Gemini (or deterministic mock) analysis on pasted tender text, persist the tender graph (requirements, risks, checklist, company fit, missing information), and append agent action logs.

**Request body:**

```json
{
  "rawText": "string (minimum 50 characters)",
  "companyProfile": {
    "companyName": "optional",
    "industry": "optional",
    "services": ["optional", "strings"],
    "location": "optional"
  }
}
```

Omitted `companyProfile` fields merge with the server default profile (`defaultCompanyProfile` in `tender.validator.js`).

**Response:** **201** — `data` is the full tender detail object (same shape as `GET /api/tenders/:id`).

**Validation errors:** **422** if `rawText` is missing or shorter than 50 characters.

**Upstream AI errors:** **502** when live Gemini fails and silent fallback is disabled (`GEMINI_SILENT_FALLBACK=false`, `ENABLE_MOCK_AI=false`, API key set).

---

## 3. `GET /api/tenders`

**Purpose:** List analyzed tenders (newest first).

**Query filters** (all optional):

| Parameter        | Description                                      |
| ---------------- | ------------------------------------------------ |
| `recommendation` | Exact match: `proceed`, `proceed_with_caution`, `do_not_bid` |
| `riskLevel`      | Exact match: `low`, `medium`, `high`              |
| `status`         | Exact match on `Tender.status` (default stored: `analyzed`) |
| `search`         | Case-sensitive `contains` on title, client, category, or `rawText` (SQLite) |

**Response example:**

```json
{
  "success": true,
  "message": "Tenders fetched",
  "data": [
    {
      "id": "…",
      "title": "…",
      "client": "…",
      "category": "…",
      "deadline": "2026-06-12T11:00:00.000Z",
      "bidFitScore": 72,
      "recommendation": "proceed_with_caution",
      "riskLevel": "medium",
      "status": "analyzed",
      "emailSent": false,
      "createdAt": "…"
    }
  ]
}
```

---

## 4. `GET /api/tenders/:id`

**Purpose:** Load one tender with nested summaries, checklist, logs, and both nested (`tenderSummary`, `decision`, …) and flat fields for UI compatibility.

**Response:** `data` includes, among others:

- `tenderSummary`, `companyFit`, `decision`, `requirements`, `riskAssessment`, `executionPlan`, `automationPlan`
- `notificationLogs`, `agentActionLogs`
- Flat duplicates: `title`, `riskFlags`, `checklistItems`, etc.

---

## 5. `PATCH /api/tenders/:id/checklist/:itemId`

**Purpose:** Set checklist item status.

**Request body:**

```json
{
  "status": "pending | completed"
}
```

**Response example:** **200** — `data` is the updated Prisma `ChecklistItem` row (`id`, `tenderId`, `title`, `status`, …).

**Errors:** **404** if the item does not belong to this tender.

---

## 6. `POST /api/tenders/:id/email`

**Purpose:** Send HTML/text tender summary via SendGrid, or return a mock preview when email is disabled or misconfigured.

**Request body:**

```json
{
  "to": "recipient@example.com"
}
```

**Real mode** (`ENABLE_EMAIL=true`, valid `SENDGRID_API_KEY` and `SENDGRID_FROM_EMAIL`):

```json
{
  "success": true,
  "message": "Email sent",
  "data": {
    "status": "sent",
    "subject": "Tender Analysis Summary - …"
  }
}
```

**Mock mode** (missing/disabled SendGrid):

```json
{
  "success": true,
  "message": "Email preview (mock)",
  "data": {
    "status": "mock_sent",
    "message": "Email not sent — ENABLE_EMAIL=false or SENDGRID_API_KEY missing. Preview returned.",
    "subject": "Tender Analysis Summary - …",
    "preview": { "subject": "…", "text": "…" }
  }
}
```

The server also writes `NotificationLog` and `AgentActionLog` entries and sets `emailSent` on the tender when status is `sent` or `mock_sent`.

---

## 7. `POST /api/tenders/:id/calendar`

**Purpose:** Create a Google Calendar event when OAuth is configured, or return a Google Calendar “template” URL. Persists `calendarLink` and `calendarEventId` (or a template sentinel). Appends an agent action log.

**Success (API mode):** `data` includes `mode: "api"`, `calendarEventId`, `calendarLink` (often the event’s `htmlLink`), `message`, `persisted`, etc.

**Fallback link:** `mode: "fallback"` when Calendar API is not configured or insert fails — `calendarEventId` may be `null`, `calendarLink` is the template URL.

**Missing deadline:** **400** — `"Tender has no deadline; cannot create calendar event."`

---

## 8. `POST /api/agent/run-deadline-check`

**Purpose:** Manual sweep (for demos or ops): find tenders whose deadline falls between start of today and end of the second day ahead; log per-tender actions; optionally send reminder emails to `DEFAULT_NOTIFICATION_EMAIL` using the same SendGrid/mock stack as summaries.

**Response example:**

```json
{
  "success": true,
  "message": "Deadline check completed",
  "data": {
    "checkedTenders": 1,
    "remindersGenerated": 1,
    "actions": [
      { "tenderId": "…", "title": "…", "action": "deadline_logged" },
      { "tenderId": "…", "action": "reminder_email", "status": "sent" }
    ]
  }
}
```

If `DEFAULT_NOTIFICATION_EMAIL` is empty, reminder sends are skipped and agent logs record the skip.

---

## 9. `GET /api/dashboard/stats`

**Purpose:** Portfolio KPIs, recent tenders, and recent agent activity for the dashboard.

**Response example:**

```json
{
  "success": true,
  "message": "Dashboard stats",
  "data": {
    "totalTenders": 3,
    "proceedCount": 1,
    "cautionCount": 1,
    "doNotBidCount": 1,
    "highRiskCount": 0,
    "upcomingDeadlines": 2,
    "pendingChecklistItems": 8,
    "completedChecklistItems": 2,
    "totalAgentActions": 24,
    "emailsSent": 1,
    "calendarRemindersCreated": 1,
    "recentTenders": [],
    "recentAgentActions": []
  }
}
```

`calendarRemindersCreated` counts agent actions with `actionType` `calendar_reminder_created`.

---

## 10. `DELETE /api/tenders/:id`

**Purpose:** Delete a tender; related rows cascade per Prisma schema.

**Response example:**

```json
{
  "success": true,
  "message": "Tender deleted",
  "data": {}
}
```

**Errors:** **404** if the tender does not exist.
