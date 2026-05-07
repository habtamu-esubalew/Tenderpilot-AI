const { prisma } = require('../config/prisma');
const {
  analyzeTenderWithGemini,
  analysisToPersistencePayload,
} = require('./gemini.service');
const { AppError } = require('../middleware/error.middleware');
const {
  createDeadlineEvent,
  TEMPLATE_EVENT_ID_MARKER,
} = require('./calendar.service');
const { sendTenderEmail } = require('./email.service');
const { createAgentActionLog, AGENT_ACTION_TYPES } = require('./agentAction.service');

//****** Tenders — Prisma + Gemini + side effects **************//

const tenderIncludeList = {
  requiredDocuments: true,
  eligibilityCriteria: true,
  financialRequirements: { orderBy: { createdAt: 'asc' } },
  technicalRequirements: { orderBy: { createdAt: 'asc' } },
  checklistItems: { orderBy: { createdAt: 'asc' } },
  riskFlags: { orderBy: { createdAt: 'asc' } },
  companyFit: true,
  missingInformationItems: { orderBy: { createdAt: 'asc' } },
};

const tenderIncludeDetail = {
  ...tenderIncludeList,
  notificationLogs: { orderBy: { createdAt: 'desc' } },
  agentActionLogs: { orderBy: { createdAt: 'desc' } },
};

function parseJsonArrayField(raw) {
  if (raw == null || raw === '') return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

function parseJsonObjectField(raw, fallback) {
  if (raw == null || raw === '') return fallback;
  try {
    const v = JSON.parse(raw);
    if (v && typeof v === 'object' && !Array.isArray(v)) return v;
  } catch {
  }
  return fallback;
}

function parseAgentMetadata(raw) {
  if (raw == null || raw === '') return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function formatTenderListItem(tender) {
  return {
    id: tender.id,
    title: tender.title,
    client: tender.client,
    category: tender.category,
    deadline: tender.deadline ? tender.deadline.toISOString() : null,
    bidFitScore: tender.bidFitScore,
    recommendation: tender.recommendation,
    riskLevel: tender.riskLevel,
    status: tender.status,
    emailSent: tender.emailSent,
    createdAt: tender.createdAt,
  };
}

function formatTenderDetail(tender) {
  if (!tender) return null;

  const missingInformation = (tender.missingInformationItems || []).map((m) => m.description);

  const matchedServices = tender.companyFit
    ? parseJsonArrayField(tender.companyFit.matchedServices)
    : [];
  const unmatchedRequirements = tender.companyFit
    ? parseJsonArrayField(tender.companyFit.unmatchedRequirements)
    : [];
  const fitExplanation = tender.companyFit?.fitExplanation || '—';

  let automationPlan = parseJsonObjectField(tender.automationPlan, null);
  if (!automationPlan || typeof automationPlan !== 'object' || Array.isArray(automationPlan)) {
    automationPlan = {
      calendarReminderNeeded: true,
      emailSummaryNeeded: true,
      followUpReminderNeeded: true,
      suggestedReminderDate: tender.deadline ? tender.deadline.toISOString() : null,
      stakeholdersToNotify: [],
    };
  }

  return {
    id: tender.id,
    status: tender.status,
    rawText: tender.rawText,
    calendarEventId: tender.calendarEventId,
    calendarLink: tender.calendarLink,
    emailSent: tender.emailSent,
    createdAt: tender.createdAt,
    updatedAt: tender.updatedAt,
    tenderSummary: {
      title: tender.title,
      client: tender.client,
      industry: tender.industry || tender.category,
      category: tender.category,
      location: tender.location,
      deadline: tender.deadline ? tender.deadline.toISOString() : null,
      submissionMethod: tender.submissionMethod,
      cpoRequirement: tender.cpoRequirement,
      estimatedEffort: tender.estimatedEffort || 'medium',
      urgencyLevel: tender.urgencyLevel || 'medium',
    },
    companyFit: {
      matchedServices,
      unmatchedRequirements,
      fitExplanation,
    },
    decision: {
      bidFitScore: tender.bidFitScore,
      recommendation: tender.recommendation,
      confidence: tender.confidence || 'medium',
      reasoning: tender.reasoning,
    },
    requirements: {
      requiredDocuments: (tender.requiredDocuments || []).map((d) => d.name),
      eligibilityCriteria: (tender.eligibilityCriteria || []).map((c) => c.description),
      financialRequirements: (tender.financialRequirements || []).map((f) => f.description),
      technicalRequirements: (tender.technicalRequirements || []).map((t) => t.description),
    },
    riskAssessment: {
      riskLevel: tender.riskLevel,
      riskFlags: (tender.riskFlags || []).map((r) => ({
        id: r.id,
        title: r.title,
        severity: r.severity,
        description: r.description,
        createdAt: r.createdAt,
      })),
      missingInformation,
    },
    executionPlan: {
      nextBestAction:
        tender.nextBestAction ||
        'Review the tender pack and confirm open questions with the buyer.',
      checklist: (tender.checklistItems || []).map((c) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        category: c.category || 'review',
        priority: c.priority,
        dueDate: c.dueDate ? c.dueDate.toISOString() : null,
        status: c.status,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
    },
    automationPlan,
    notificationLogs: (tender.notificationLogs || []).map((n) => ({
      id: n.id,
      type: n.type,
      recipient: n.recipient,
      subject: n.subject,
      status: n.status,
      message: n.message,
      createdAt: n.createdAt,
    })),
    agentActionLogs: (tender.agentActionLogs || []).map((a) => ({
      id: a.id,
      actionType: a.actionType,
      title: a.title,
      description: a.description,
      status: a.status,
      metadata: parseAgentMetadata(a.metadata),
      createdAt: a.createdAt,
    })),

    title: tender.title,
    client: tender.client,
    category: tender.category,
    industry: tender.industry,
    location: tender.location,
    deadline: tender.deadline ? tender.deadline.toISOString() : null,
    submissionMethod: tender.submissionMethod,
    cpoRequirement: tender.cpoRequirement,
    estimatedEffort: tender.estimatedEffort,
    urgencyLevel: tender.urgencyLevel,
    bidFitScore: tender.bidFitScore,
    recommendation: tender.recommendation,
    riskLevel: tender.riskLevel,
    reasoning: tender.reasoning,
    confidence: tender.confidence,
    nextBestAction: tender.nextBestAction,
    requiredDocuments: tender.requiredDocuments || [],
    eligibilityCriteria: tender.eligibilityCriteria || [],
    financialRequirements: tender.financialRequirements || [],
    technicalRequirements: tender.technicalRequirements || [],
    checklistItems: tender.checklistItems || [],
    riskFlags: tender.riskFlags || [],
  };
}

async function analyzeAndCreateTender(rawText, companyProfile) {
  let analysis;
  try {
    analysis = await analyzeTenderWithGemini(rawText, companyProfile);
  } catch (e) {
    if (e instanceof AppError) throw e;
    const msg = e instanceof Error ? e.message : String(e);
    throw new AppError(msg, 502);
  }
  const payload = analysisToPersistencePayload(analysis);

  //****** Omit empty nested creates (Prisma + SQLite) **************//

  function optionalCreates() {
    const extra = {};

    const miss = payload.missingInformation ?? [];
    if (miss.length) {
      extra.missingInformationItems = {
        create: miss.map((description) => ({ description })),
      };
    }

    const docs = payload.requiredDocuments ?? [];
    if (docs.length) {
      extra.requiredDocuments = {
        create: docs.map((name) => ({
          name,
          isRequired: true,
        })),
      };
    }

    const elig = payload.eligibilityCriteria ?? [];
    if (elig.length) {
      extra.eligibilityCriteria = {
        create: elig.map((description) => ({ description })),
      };
    }

    const fin = payload.financialRequirements ?? [];
    if (fin.length) {
      extra.financialRequirements = {
        create: fin.map((description) => ({ description })),
      };
    }

    const tech = payload.technicalRequirements ?? [];
    if (tech.length) {
      extra.technicalRequirements = {
        create: tech.map((description) => ({ description })),
      };
    }

    const flags = payload.riskFlags ?? [];
    if (flags.length) {
      extra.riskFlags = {
        create: flags.map((rf) => ({
          title: rf.title,
          severity: rf.severity,
          description: rf.description,
        })),
      };
    }

    const items = payload.checklist ?? [];
    if (items.length) {
      extra.checklistItems = {
        create: items.map((item) => ({
          title: item.title,
          description: item.description ?? null,
          category: item.category ?? 'review',
          priority: item.priority,
          dueDate: item.dueDate ?? null,
          status: 'pending',
        })),
      };
    }

    return extra;
  }

  //****** SQLite — short TX; agent logs after commit **************//

  const created = await prisma.$transaction(
    async (tx) =>
      tx.tender.create({
        data: {
          title: payload.title,
          client: payload.client,
          category: payload.category,
          industry: payload.industry ?? null,
          location: payload.location ?? null,
          rawText,
          deadline: payload.deadline ?? null,
          submissionMethod: payload.submissionMethod ?? null,
          cpoRequirement: payload.cpoRequirement ?? null,
          estimatedEffort: payload.estimatedEffort ?? null,
          urgencyLevel: payload.urgencyLevel ?? null,
          riskLevel: payload.riskLevel,
          bidFitScore: payload.bidFitScore,
          recommendation: payload.recommendation,
          confidence: payload.confidence ?? null,
          reasoning: payload.reasoning,
          nextBestAction: payload.nextBestAction ?? null,
          automationPlan:
            payload.automationPlan != null ? JSON.stringify(payload.automationPlan) : null,
          status: 'analyzed',
          companyFit: {
            create: {
              fitExplanation: payload.fitExplanation,
              matchedServices: JSON.stringify(payload.matchedServices ?? []),
              unmatchedRequirements: JSON.stringify(payload.unmatchedRequirements ?? []),
            },
          },
          ...optionalCreates(),
        },
        select: { id: true },
      }),
    { maxWait: 90_000, timeout: 180_000 },
  );

  const log = (entry) =>
    createAgentActionLog(prisma, { tenderId: created.id, status: 'completed', ...entry });

  await log({
    actionType: AGENT_ACTION_TYPES.TENDER_ANALYZED,
    title: 'Tender analyzed',
    description: 'Agent parsed the notice and persisted structured tender data.',
  });
  await log({
    actionType: AGENT_ACTION_TYPES.REQUIREMENTS_EXTRACTED,
    title: 'Requirements extracted',
    description: 'Documents, eligibility, financial, and technical requirements captured.',
  });
  await log({
    actionType: AGENT_ACTION_TYPES.BID_FIT_SCORED,
    title: 'Bid fit score calculated',
    description: `Score ${payload.bidFitScore}/100 with recommendation ${payload.recommendation}.`,
    metadata: { bidFitScore: payload.bidFitScore, recommendation: payload.recommendation },
  });
  await log({
    actionType: AGENT_ACTION_TYPES.RISK_FLAGS_GENERATED,
    title: 'Risk flags generated',
    description: `${payload.riskFlags.length} risk flag(s) recorded.`,
    metadata: { count: payload.riskFlags.length },
  });
  await log({
    actionType: AGENT_ACTION_TYPES.CHECKLIST_GENERATED,
    title: 'Checklist generated',
    description: `${payload.checklist.length} execution checklist item(s) created.`,
    metadata: { count: payload.checklist.length },
  });

  const detail = await getTenderById(created.id);
  if (!detail) {
    throw new AppError('Tender persisted but could not reload for response', 500);
  }
  return detail;
}

async function listTenders(query) {
  const { recommendation, riskLevel, status, search } = query;
  const where = {};

  if (recommendation) where.recommendation = recommendation;
  if (riskLevel) where.riskLevel = riskLevel;
  if (status) where.status = status;

  if (search && String(search).trim()) {
    const q = String(search).trim();
    where.OR = [
      { title: { contains: q } },
      { client: { contains: q } },
      { category: { contains: q } },
      { rawText: { contains: q } },
    ];
  }

  const rows = await prisma.tender.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: tenderIncludeList,
  });

  return rows.map((t) => formatTenderListItem(t));
}

async function getTenderById(id) {
  const tender = await prisma.tender.findUnique({
    where: { id },
    include: tenderIncludeDetail,
  });
  return formatTenderDetail(tender);
}

async function getTenderEntityForAutomation(id) {
  return prisma.tender.findUnique({
    where: { id },
    include: tenderIncludeList,
  });
}

async function patchChecklistItem(tenderId, itemId, status) {
  const item = await prisma.checklistItem.findFirst({
    where: { id: itemId, tenderId },
  });
  if (!item) {
    throw new AppError('Checklist item not found for this tender', 404);
  }

  return prisma.checklistItem.update({
    where: { id: itemId },
    data: { status },
  });
}

async function addCalendarForTender(tenderId) {
  const tender = await getTenderEntityForAutomation(tenderId);
  if (!tender) {
    throw new AppError('Tender not found', 404);
  }

  const result = await createDeadlineEvent(tender);

  const persistedEventId =
    result.mode === 'api' && result.calendarEventId
      ? result.calendarEventId
      : TEMPLATE_EVENT_ID_MARKER;

  await prisma.tender.update({
    where: { id: tenderId },
    data: {
      calendarLink: result.calendarLink || null,
      calendarEventId: persistedEventId,
    },
  });

  const logStatus =
    result.mode === 'api' && result.calendarEventId && !result.warning ? 'completed' : 'mock';

  await createAgentActionLog(prisma, {
    tenderId,
    actionType: AGENT_ACTION_TYPES.CALENDAR_REMINDER_CREATED,
    title:
      result.mode === 'api' && !result.warning
        ? 'Calendar reminder created'
        : 'Calendar reminder (template link)',
    description: [result.message, result.warning].filter(Boolean).join(' ') || null,
    status: logStatus,
    metadata: {
      mode: result.mode,
      calendarLink: result.calendarLink,
      calendarEventId: result.calendarEventId,
      persistedEventId,
    },
  });

  //****** Response: `link` mirrors calendarLink (legacy) **************//

  return {
    warning: result.warning,
    message: result.message,
    persisted: {
      calendarEventId: persistedEventId,
      calendarLink: result.calendarLink,
    },
  };
}

async function sendEmailForTender(tenderId, to) {
  const tender = await prisma.tender.findUnique({
    where: { id: tenderId },
    include: tenderIncludeList,
  });
  if (!tender) {
    throw new AppError('Tender not found', 404);
  }

  const outcome = await sendTenderEmail({ to, tender });
  const status = outcome.status;

  await prisma.notificationLog.create({
    data: {
      tenderId,
      type: 'tender_summary',
      recipient: to,
      subject: outcome.subject || `Tender Analysis Summary - ${tender.title}`,
      status,
      message:
        status === 'mock_sent'
          ? outcome.message || 'Mock-sent / preview mode'
          : 'Email dispatched via SendGrid',
    },
  });

  await createAgentActionLog(prisma, {
    tenderId,
    actionType: AGENT_ACTION_TYPES.EMAIL_SUMMARY_SENT,
    title: status === 'sent' ? 'Email summary sent' : 'Email summary (mock preview)',
    description: outcome.message || null,
    status: status === 'sent' ? 'completed' : 'mock',
    metadata: { recipient: to },
  });

  if (status === 'sent' || status === 'mock_sent') {
    await prisma.tender.update({
      where: { id: tenderId },
      data: { emailSent: true },
    });
  }

  return outcome;
}

async function deleteTender(id) {
  try {
    await prisma.tender.delete({ where: { id } });
  } catch (e) {
    if (e.code === 'P2025') {
      throw new AppError('Tender not found', 404);
    }
    throw e;
  }
}

module.exports = {
  analyzeAndCreateTender,
  listTenders,
  getTenderById,
  patchChecklistItem,
  addCalendarForTender,
  sendEmailForTender,
  deleteTender,
  formatTenderDetail,
  formatTenderListItem,
  tenderIncludeDetail,
  tenderIncludeList,
};
