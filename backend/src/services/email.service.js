const sgMail = require('@sendgrid/mail');
const { env, hasSendGrid } = require('../config/env');

//****** SendGrid send or in-app preview **************//

function initSendGrid() {
  if (hasSendGrid()) {
    sgMail.setApiKey(env.SENDGRID_API_KEY);
  }
}

function formatRiskFlagsForEmail(tender) {
  const flags = tender.riskFlags || [];
  if (!flags.length) return '—';
  return flags.map((f) => `- [${f.severity}] ${f.title}: ${f.description}`).join('\n');
}

function formatChecklistForEmail(tender) {
  return (
    tender.checklistItems
      ?.map(
        (c) =>
          `- [${c.status}] ${c.title} (${c.priority}${c.category ? `, ${c.category}` : ''})`,
      )
      .join('\n') || '—'
  );
}

function buildTenderSummaryEmail(tender) {
  const subject = `Tender Analysis Summary - ${tender.title}`;

  const docs = tender.requiredDocuments?.map((d) => d.name).join(', ') || '—';
  const eligibility =
    tender.eligibilityCriteria?.map((c) => c.description).join(' | ') || '—';
  const financial =
    tender.financialRequirements?.map((f) => f.description).join(' | ') || '—';
  const technical =
    tender.technicalRequirements?.map((t) => t.description).join(' | ') || '—';

  const checklist = formatChecklistForEmail(tender);
  const riskFlagsText = formatRiskFlagsForEmail(tender);
  const missingDescriptions =
    tender.missingInformationItems?.map((m) => m.description) ?? [];
  const missing =
    missingDescriptions.length > 0 ? missingDescriptions.join(' | ') : '—';

  const nextAction =
    tender.nextBestAction ||
    (tender.recommendation === 'do_not_bid'
      ? 'Archive unless strategic; document disqualifiers.'
      : tender.recommendation === 'proceed_with_caution'
        ? 'Resolve open risks before final bid approval.'
        : 'Mobilize bid team and lock internal review timeline.');

  const confidence = tender.confidence || '—';

  const lines = [
    `Tender: ${tender.title}`,
    `Client: ${tender.client}`,
    `Deadline: ${tender.deadline ? tender.deadline.toISOString() : 'Not specified'}`,
    `Bid fit score: ${tender.bidFitScore}/100`,
    `Recommendation: ${tender.recommendation}`,
    `Confidence: ${confidence}`,
    `Risk level: ${tender.riskLevel}`,
    '',
    'Risk flags:',
    riskFlagsText,
    '',
    'Missing information:',
    missing,
    '',
    'Required documents:',
    docs,
    '',
    'Eligibility criteria:',
    eligibility,
    '',
    'Financial requirements:',
    financial,
    '',
    'Technical requirements:',
    technical,
    '',
    'Checklist:',
    checklist,
    '',
    'Next best action:',
    nextAction,
  ];

  const text = lines.join('\n');

  const riskFlagsHtml =
    tender.riskFlags?.length ?
      `<ul>${tender.riskFlags.map((f) => `<li><strong>[${f.severity}]</strong> ${f.title}: ${f.description}</li>`).join('')}</ul>`
    : '<p>—</p>';

  const missingHtml =
    missingDescriptions.length > 0 ?
      `<ul>${missingDescriptions.map((m) => `<li>${m}</li>`).join('')}</ul>`
    : '<p>—</p>';

  const html = `
    <h2>${tender.title}</h2>
    <p><strong>Client:</strong> ${tender.client}</p>
    <p><strong>Deadline:</strong> ${tender.deadline ? tender.deadline.toISOString() : 'Not specified'}</p>
    <p><strong>Bid fit score:</strong> ${tender.bidFitScore}/100</p>
    <p><strong>Recommendation:</strong> ${tender.recommendation}</p>
    <p><strong>Confidence:</strong> ${confidence}</p>
    <p><strong>Risk level:</strong> ${tender.riskLevel}</p>
    <h3>Risk flags</h3>
    ${riskFlagsHtml}
    <h3>Missing information</h3>
    ${missingHtml}
    <h3>Required documents</h3>
    <p>${docs}</p>
    <h3>Eligibility criteria</h3>
    <p>${eligibility}</p>
    <h3>Financial requirements</h3>
    <p>${financial}</p>
    <h3>Technical requirements</h3>
    <p>${technical}</p>
    <h3>Checklist</h3>
    <pre style="font-family: sans-serif; white-space: pre-wrap;">${checklist}</pre>
    <h3>Next best action</h3>
    <p>${nextAction}</p>
  `;

  return { subject, text, html };
}

async function sendTenderEmail({ to, tender, subjectOverride }) {
  initSendGrid();
  const built = buildTenderSummaryEmail(tender);
  const subject = subjectOverride || built.subject;
  const { text, html } = built;

  if (!hasSendGrid()) {
    return {
      status: 'mock_sent',
      message: 'Email not sent — ENABLE_EMAIL=false or SENDGRID_API_KEY missing. Preview returned.',
      subject,
      preview: { subject, text },
    };
  }

  if (!env.SENDGRID_FROM_EMAIL) {
    return {
      status: 'mock_sent',
      message: 'SENDGRID_FROM_EMAIL not configured.',
      subject,
      preview: { subject, text },
    };
  }

  await sgMail.send({
    to,
    from: env.SENDGRID_FROM_EMAIL,
    subject,
    text,
    html,
  });

  return { status: 'sent', subject };
}

module.exports = { sendTenderEmail, buildTenderSummaryEmail };
