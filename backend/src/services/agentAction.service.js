//****** Agent action log writes **************//

const AGENT_ACTION_TYPES = {
  TENDER_ANALYZED: 'tender_analyzed',
  REQUIREMENTS_EXTRACTED: 'requirements_extracted',
  BID_FIT_SCORED: 'bid_fit_scored',
  CHECKLIST_GENERATED: 'checklist_generated',
  CALENDAR_REMINDER_CREATED: 'calendar_reminder_created',
  EMAIL_SUMMARY_SENT: 'email_summary_sent',
  DEADLINE_CHECK_COMPLETED: 'deadline_check_completed',
  DEADLINE_REMINDER_DISPATCHED: 'deadline_reminder_dispatched',
  RISK_FLAGS_GENERATED: 'risk_flags_generated',
};

async function createAgentActionLog(db, payload) {
  const { tenderId, actionType, title, description, status, metadata } = payload;
  let metaStr;
  if (metadata !== undefined && metadata !== null) {
    metaStr = typeof metadata === 'string' ? metadata : JSON.stringify(metadata);
  }

  return db.agentActionLog.create({
    data: {
      tenderId: tenderId ?? null,
      actionType,
      title,
      description: description ?? null,
      status,
      metadata: metaStr,
    },
  });
}

module.exports = {
  AGENT_ACTION_TYPES,
  createAgentActionLog,
};
