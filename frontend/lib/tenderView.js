import { displayText } from '@/lib/formatters';

//****** Normalize tender DTO (nested + flat legacy) **************//

export function getTenderView(t) {
  if (!t) return null;

  const ts = t.tenderSummary || {};
  const decision = t.decision || {};
  const req = t.requirements || {};
  const risk = t.riskAssessment || {};
  const exec = t.executionPlan || {};
  const cf = t.companyFit || {};

  const docNames =
    Array.isArray(req.requiredDocuments) && req.requiredDocuments.length
      ? req.requiredDocuments.map(String)
      : (t.requiredDocuments || [])
          .map((d) => (typeof d === 'string' ? d : d?.name))
          .filter(Boolean);

  const eligibility =
    Array.isArray(req.eligibilityCriteria) && req.eligibilityCriteria.length
      ? req.eligibilityCriteria.map(String)
      : (t.eligibilityCriteria || [])
          .map((c) => (typeof c === 'string' ? c : c?.description))
          .filter(Boolean);

  const financial =
    Array.isArray(req.financialRequirements) && req.financialRequirements.length
      ? req.financialRequirements.map(String)
      : (t.financialRequirements || [])
          .map((f) => (typeof f === 'string' ? f : f?.description))
          .filter(Boolean);

  const technical =
    Array.isArray(req.technicalRequirements) && req.technicalRequirements.length
      ? req.technicalRequirements.map(String)
      : (t.technicalRequirements || [])
          .map((x) => (typeof x === 'string' ? x : x?.description))
          .filter(Boolean);

  const checklist =
    Array.isArray(exec.checklist) && exec.checklist.length
      ? exec.checklist
      : t.checklistItems || [];

  const riskFlags =
    Array.isArray(risk.riskFlags) && risk.riskFlags.length
      ? risk.riskFlags
      : t.riskFlags || [];

  let missing =
    Array.isArray(risk.missingInformation) && risk.missingInformation.length
      ? risk.missingInformation.map(String)
      : [];

  if (!missing.length && Array.isArray(t.missingInformationItems)) {
    missing = t.missingInformationItems
      .map((m) => (typeof m === 'string' ? m : m?.description))
      .filter(Boolean);
  }

  const matchedServices = Array.isArray(cf.matchedServices)
    ? cf.matchedServices.map(String)
    : [];
  const unmatchedRequirements = Array.isArray(cf.unmatchedRequirements)
    ? cf.unmatchedRequirements.map(String)
    : [];

  const deadline = ts.deadline ?? t.deadline ?? null;

  return {
    id: t.id,
    status: t.status,
    title: displayText(ts.title || t.title, 'Not specified'),
    client: displayText(ts.client || t.client, 'Not specified'),
    category: displayText(ts.category || t.category, 'Not specified'),
    industry: displayText(ts.industry || t.industry, 'Not specified'),
    location: displayText(ts.location || t.location, 'Not specified'),
    deadline,
    submissionMethod: displayText(ts.submissionMethod || t.submissionMethod, 'Not detected'),
    cpoRequirement: displayText(ts.cpoRequirement || t.cpoRequirement, 'Not detected'),
    estimatedEffort: displayText(ts.estimatedEffort || t.estimatedEffort, 'Not specified'),
    urgencyLevel: displayText(ts.urgencyLevel || t.urgencyLevel, 'Not specified'),
    bidFitScore: decision.bidFitScore ?? t.bidFitScore ?? 0,
    recommendation: decision.recommendation ?? t.recommendation,
    confidence: decision.confidence ?? t.confidence ?? 'medium',
    reasoning: decision.reasoning ?? t.reasoning ?? '',
    nextBestAction:
      exec.nextBestAction ||
      t.nextBestAction ||
      'Review the tender pack and confirm open questions with the buyer.',
    companyFit: {
      matchedServices,
      unmatchedRequirements,
      fitExplanation: displayText(cf.fitExplanation, 'Not specified'),
    },
    requirements: {
      requiredDocuments: docNames,
      eligibilityCriteria: eligibility,
      financialRequirements: financial,
      technicalRequirements: technical,
    },
    riskLevel: risk.riskLevel || t.riskLevel || 'medium',
    riskFlags,
    missingInformation: missing,
    checklistItems: checklist,
    automationPlan: t.automationPlan || null,
    notificationLogs: t.notificationLogs || [],
    agentActionLogs: t.agentActionLogs || [],
    calendarLink: t.calendarLink || null,
    emailSent: Boolean(t.emailSent),
    raw: t,
  };
}
