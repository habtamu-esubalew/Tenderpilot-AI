const { GoogleGenerativeAI } = require('@google/generative-ai');
const { env, shouldUseMockAi, shouldSilentlyFallbackAfterGeminiError } = require('../config/env');
const { geminiAnalysisSchema } = require('../validators/tender.validator');
const { parseIsoDate } = require('../utils/dateUtils');

//****** Gemini — prompt, live + mock analysis **************//

const GEMINI_SYSTEM_PROMPT = `You are TenderPilot AI, a senior Bid/Tender Manager Agent specializing in printing, advertising, and procurement service companies. Your job is not only to summarize tenders. Your job is to help the company decide whether to bid, understand the work required, avoid missed deadlines, and convert the tender into an execution plan. Analyze the tender like a business operator and return strict JSON only.

Identity and tone:
- Write reasoning like an experienced bid desk lead: practical, conservative, and commercially aware.
- If information is unclear, say so and reflect that in scores, risk, and missingInformation.

Scoring (bidFitScore 0–100):
- Start from how well the scope matches the company's services and geography.
- Deduct materially for eligibility gaps, unclear submission rules, unrealistic timelines against printing/advertising delivery norms, or missing mandatory documents.
- Deduct if the notice implies work outside the company's stated capabilities.

Deadline and urgency:
- If no submission deadline appears in the text, set tenderSummary.deadline to null, add explicit items to riskAssessment.missingInformation, raise urgency cautiously, and avoid inventing a date in reasoning.
- If the deadline is within ~7 days from analysis time, set urgencyLevel to high (or medium if explicitly extended) and increase risk if the pack looks incomplete.
- If the deadline is soon and dependencies are heavy (samples, bonds, portals), raise riskLevel and favor proceed_with_caution unless fit is exceptional.

Recommendations:
- proceed: strong fit, requirements mostly clear, manageable risk.
- proceed_with_caution: winnable but needs clarifications, compliance checks, or tight delivery risk.
- do_not_bid: poor fit, disqualifying gaps, excessive ambiguity, or commercially unattractive constraints.

CPO / procurement:
- Extract CPO or performance bond / guarantee language into tenderSummary.cpoRequirement when present; otherwise null.

Document discipline:
- If mandatory document list is vague, flag in riskFlags and missingInformation and lower confidence.

Output contract:
- Return ONLY one JSON object. No markdown. No code fences. No commentary outside JSON.
- All string arrays may be empty but must be arrays. Booleans must be true/false.

You will receive COMPANY_PROFILE_JSON and TENDER_TEXT. Fill every field in the REQUIRED_SCHEMA exactly.`;

const REQUIRED_SCHEMA_BLOCK = `{
  "tenderSummary": {
    "title": "string",
    "client": "string",
    "industry": "string",
    "category": "string",
    "location": "string or null",
    "deadline": "ISO date string or null",
    "submissionMethod": "string or null",
    "cpoRequirement": "string or null",
    "estimatedEffort": "low | medium | high",
    "urgencyLevel": "low | medium | high"
  },
  "companyFit": {
    "matchedServices": ["string"],
    "unmatchedRequirements": ["string"],
    "fitExplanation": "string"
  },
  "decision": {
    "bidFitScore": 0,
    "recommendation": "proceed | proceed_with_caution | do_not_bid",
    "confidence": "low | medium | high",
    "reasoning": "string"
  },
  "requirements": {
    "requiredDocuments": ["string"],
    "eligibilityCriteria": ["string"],
    "financialRequirements": ["string"],
    "technicalRequirements": ["string"]
  },
  "riskAssessment": {
    "riskLevel": "low | medium | high",
    "riskFlags": [
      {
        "title": "string",
        "severity": "low | medium | high",
        "description": "string"
      }
    ],
    "missingInformation": ["string"]
  },
  "executionPlan": {
    "nextBestAction": "string",
    "checklist": [
      {
        "title": "string",
        "description": "string",
        "priority": "low | medium | high",
        "category": "document | financial | technical | submission | review | communication",
        "dueDate": "ISO date string or null"
      }
    ]
  },
  "automationPlan": {
    "calendarReminderNeeded": true,
    "emailSummaryNeeded": true,
    "followUpReminderNeeded": true,
    "suggestedReminderDate": "ISO date string or null",
    "stakeholdersToNotify": ["string"]
  }
}`;

function buildGeminiUserContent(companyProfile, rawText) {
  return `${GEMINI_SYSTEM_PROMPT}

COMPANY_PROFILE_JSON:
${JSON.stringify(companyProfile)}

REQUIRED_SCHEMA (structure and keys — return valid JSON matching this shape):
${REQUIRED_SCHEMA_BLOCK}

TENDER_TEXT:
---
${rawText}
---`;
}

function stripJsonFromMarkdown(text) {
  if (!text || typeof text !== 'string') return text;
  const trimmed = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/im.exec(trimmed);
  if (fence) return fence[1].trim();
  return trimmed;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractRetryDelayFromMessageMs(err) {
  const m = /retry in ([\d.]+)s/i.exec(String(err.message || err));
  if (m) return Math.min(Math.ceil(parseFloat(m[1], 10) * 1000) + 500, 90000);
  return null;
}

function computeBackoffMs(err, attemptIndex) {
  const explicit = extractRetryDelayFromMessageMs(err);
  if (explicit != null) return explicit;
  const s = String(err.message || err);
  if (/503|high demand|Service Unavailable|overloaded|EAI_AGAIN/i.test(s)) {
    return Math.min(4000 + attemptIndex * 7000, 40000);
  }
  return 45_000;
}

function isRetryableGeminiApiError(err) {
  const s = String(err.message || err);
  return (
    /429|quota|rate limit|Too Many Requests|RESOURCE_EXHAUSTED/i.test(s) ||
    /503|Service Unavailable|high demand|temporarily unavailable|try again later/i.test(s)
  );
}

function humanizeGeminiFailure(err) {
  const raw = String(err.message || err);
  if (/404[^\n]*not found|models\/[\w.-]+ is not found/i.test(raw)) {
    return (
      'This GEMINI_MODEL is not served on the Generative Language API (404). Google has removed many 1.5 aliases; ' +
      'set GEMINI_MODEL=gemini-2.5-flash or GEMINI_MODEL=gemini-flash-latest and verify names at ' +
      'https://ai.google.dev/gemini-api/docs/models — details: '
    ).concat(raw.slice(0, 400));
  }
  if (/429|quota|limit:\s*0/i.test(raw)) {
    return (
      'Gemini returned HTTP 429 or zero quota for this model. Fix: enable Generative Language API for your Google Cloud ' +
      'project, attach billing if required, or try another model your tier allows (see ' +
      'https://ai.google.dev/gemini-api/docs/rate-limits). Details: '
    ).concat(raw.slice(0, 400));
  }
  if (/503|high demand|Service Unavailable/i.test(raw)) {
    return (
      'Gemini returned HTTP 503 (high demand / temporarily unavailable). Wait a minute and retry, or set GEMINI_MODEL to ' +
      'another tier (e.g. gemini-flash-latest). The server auto-retries a few times when GEMINI_RETRY_ON_429=true. Details: '
    ).concat(raw.slice(0, 400));
  }
  return `Gemini request failed: ${raw.slice(0, 600)}`;
}

function maybeMockAfterFailure(rawText, companyProfile, reason) {
  if (shouldSilentlyFallbackAfterGeminiError()) {
    console.warn(`${reason}; using mock analysis (GEMINI_SILENT_FALLBACK=true).`);
    return geminiAnalysisSchema.parse(getMockAnalysis(rawText, companyProfile));
  }
  throw new Error(reason);
}

//****** Gemini — retry on 429 / 503 **************//

async function generateContentWithBackoff(model, prompt) {
  const maxAttempts = env.GEMINI_RETRY_ON_429 ? 4 : 1;
  let lastErr;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const result = await model.generateContent(prompt);
      return result.response;
    } catch (e) {
      lastErr = e;
      const canRetry = attempt < maxAttempts - 1 && isRetryableGeminiApiError(e);
      if (canRetry) {
        const delay = computeBackoffMs(e, attempt);
        console.warn(
          `[gemini] transient API error — waiting ${delay}ms then retry (${attempt + 2}/${maxAttempts})`,
        );
        await sleep(delay);
      } else {
        throw e;
      }
    }
  }
  throw lastErr;
}

function getMockAnalysis(rawText, companyProfile) {
  const snippet = String(rawText).slice(0, 120).replace(/\s+/g, ' ');
  const fromSampleNotice =
    /june\s+12,?\s+2026/i.test(rawText) || /2026\/0842/.test(rawText);
  const demoDeadline = fromSampleNotice
    ? '2026-06-12T11:00:00.000Z'
    : new Date(Date.now() + 21 * 86400000).toISOString();
  const deadlineNote = fromSampleNotice
    ? 'Confirm buyer portal cut-off time zone; the notice references a June 12, 2026 submission window.'
    : 'Deadline not explicit in pasted excerpt — confirm against ITB pack before committing capacity.';

  return {
    tenderSummary: {
      title: 'Mock Tender — Marketing & Print Collateral Supply',
      client: 'Ethiopian Public Procurement — Demo Client',
      industry: 'Public sector marketing & print services',
      category: 'Printing & advertising services',
      location: 'Addis Ababa (delivery points per ITB)',
      deadline: demoDeadline,
      submissionMethod: 'Electronic submission portal (link to be confirmed in buyer pack)',
      cpoRequirement:
        'Compliance with applicable procurement directives; bond/performance terms to be verified.',
      estimatedEffort: 'medium',
      urgencyLevel: fromSampleNotice ? 'medium' : 'low',
    },
    companyFit: {
      matchedServices: ['Large format printing', 'Branding', 'Collateral production'],
      unmatchedRequirements: ['Confirm any bond/turnkey installation not in company scope'],
      fitExplanation: `Scope aligns with ${companyProfile.companyName}'s core printing and advertising delivery, pending confirmation of institutional compliance items.`,
    },
    decision: {
      bidFitScore: 72,
      recommendation: 'proceed_with_caution',
      confidence: 'medium',
      reasoning: `As bid manager: the opportunity matches our production stack, but several institutional gates (documents, portal mechanics, CPO compliance) must be validated before bid approval.${deadlineNote} Demo/mock analysis for TenderPilot. Excerpt: (${snippet}…).`,
    },
    requirements: {
      requiredDocuments: [
        'Valid business license',
        'Tax clearance certificate',
        'Samples of comparable print work',
        'Financial capability statement',
      ],
      eligibilityCriteria: [
        'Registered business in Ethiopia',
        'Minimum three years relevant printing experience',
        'Ability to deliver within stated region',
      ],
      financialRequirements: ['Proof of financial capacity', 'Pricing validity window per ITB'],
      technicalRequirements: [
        'Print specification conformance',
        'Quality assurance on supplied collateral',
      ],
    },
    riskAssessment: {
      riskLevel: 'medium',
      riskFlags: [
        {
          title: 'Submission channel not fully specified',
          severity: 'medium',
          description:
            'Notice references a portal but the exact URL and file naming rules are not in the excerpt.',
        },
        {
          title: 'Document pack completeness',
          severity: 'low',
          description:
            'Mandatory annex list may be incomplete; validate against the full tender pack.',
        },
      ],
      missingInformation: fromSampleNotice
        ? ['Exact portal link', 'Clarification deadline (if any)']
        : ['Confirmed submission deadline', 'Portal URL and file naming rules'],
    },
    executionPlan: {
      nextBestAction:
        'Confirm the official submission deadline and portal requirements, then validate mandatory certificates with finance and legal.',
      checklist: [
        {
          title: 'Verify deadline & portal mechanics',
          description: 'Confirm buyer clock, time zone, and allowed file formats.',
          priority: 'high',
          category: 'submission',
          dueDate: null,
        },
        {
          title: 'Validate CPO / eligibility pack',
          description: 'Cross-check licenses, tax, and any performance security wording.',
          priority: 'high',
          category: 'document',
          dueDate: null,
        },
        {
          title: 'Internal go/no-go gate',
          description: 'Capacity, margin, and delivery realism sign-off.',
          priority: 'medium',
          category: 'review',
          dueDate: null,
        },
        {
          title: 'Prepare sample portfolio pack',
          description: 'Curate relevant large-format and digital samples aligned to scope.',
          priority: 'medium',
          category: 'document',
          dueDate: null,
        },
      ],
    },
    automationPlan: {
      calendarReminderNeeded: true,
      emailSummaryNeeded: true,
      followUpReminderNeeded: true,
      suggestedReminderDate: demoDeadline,
      stakeholdersToNotify: ['Bid desk lead', 'Production manager'],
    },
  };
}

async function analyzeTenderWithGemini(rawText, companyProfile) {
  if (shouldUseMockAi()) {
    const mock = getMockAnalysis(rawText, companyProfile);
    return geminiAnalysisSchema.parse(mock);
  }

  try {
    const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: env.GEMINI_MODEL,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const prompt = buildGeminiUserContent(companyProfile, rawText);
    const response = await generateContentWithBackoff(model, prompt);
    const text = response.text();
    const cleaned = stripJsonFromMarkdown(text);

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      const msg =
        `Gemini did not return valid JSON (parse error): ${parseErr.message}. Preview: ${cleaned.slice(0, 200)}…`;
      return maybeMockAfterFailure(rawText, companyProfile, msg);
    }

    const validated = geminiAnalysisSchema.safeParse(parsed);
    if (!validated.success) {
      const details = validated.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');
      const msg = `Gemini JSON failed schema validation: ${details}`;
      return maybeMockAfterFailure(rawText, companyProfile, msg);
    }

    return validated.data;
  } catch (e) {
    if (shouldSilentlyFallbackAfterGeminiError()) {
      console.warn('[gemini] Request failed; falling back to mock analysis:', e.message || e);
      return geminiAnalysisSchema.parse(getMockAnalysis(rawText, companyProfile));
    }
    console.error('[gemini] Live analysis failed:', e.message || e);
    throw new Error(humanizeGeminiFailure(e));
  }
}

//****** Map AI output → Prisma payload **************//

function analysisToPersistencePayload(analysis) {
  const {
    tenderSummary,
    companyFit,
    decision,
    requirements,
    riskAssessment,
    executionPlan,
    automationPlan,
  } = analysis;

  const missingCombined = [...(riskAssessment.missingInformation || [])];
  if (tenderSummary.deadline == null) {
    const hasDeadlineMissing = missingCombined.some((s) =>
      /deadline|closing|submission date/i.test(s),
    );
    if (!hasDeadlineMissing) {
      missingCombined.push('Official submission deadline not confirmed from notice text');
    }
  }

  return {
    title: tenderSummary.title,
    client: tenderSummary.client,
    category: tenderSummary.category,
    industry: tenderSummary.industry,
    location: tenderSummary.location,
    deadline: parseIsoDate(tenderSummary.deadline),
    submissionMethod: tenderSummary.submissionMethod,
    cpoRequirement: tenderSummary.cpoRequirement,
    estimatedEffort: tenderSummary.estimatedEffort,
    urgencyLevel: tenderSummary.urgencyLevel,
    matchedServices: companyFit.matchedServices,
    unmatchedRequirements: companyFit.unmatchedRequirements,
    fitExplanation: companyFit.fitExplanation,
    bidFitScore: decision.bidFitScore,
    recommendation: decision.recommendation,
    confidence: decision.confidence,
    reasoning: decision.reasoning,
    riskLevel: riskAssessment.riskLevel,
    missingInformation: missingCombined,
    nextBestAction: executionPlan.nextBestAction,
    automationPlan,
    requiredDocuments: requirements.requiredDocuments,
    eligibilityCriteria: requirements.eligibilityCriteria,
    financialRequirements: requirements.financialRequirements,
    technicalRequirements: requirements.technicalRequirements,
    riskFlags: riskAssessment.riskFlags,
    checklist: executionPlan.checklist.map((item) => ({
      title: item.title,
      description: item.description ?? '',
      priority: item.priority,
      category: item.category,
      dueDate: parseIsoDate(item.dueDate),
    })),
  };
}

module.exports = {
  analyzeTenderWithGemini,
  analysisToPersistencePayload,
  getMockAnalysis,
};
