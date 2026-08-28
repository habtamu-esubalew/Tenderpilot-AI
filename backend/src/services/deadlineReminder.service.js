const { prisma } = require('../config/prisma');
const { env } = require('../config/env');
const { sendTenderEmail, buildTenderSummaryEmail } = require('./email.service');
const { createAgentActionLog, AGENT_ACTION_TYPES } = require('./agentAction.service');
const { startOfDay, endOfDay, addDays } = require('../utils/dateUtils');

//****** Shared deadline window scan + reminder dispatch **************//

const REMINDER_WINDOW_DAYS = 2;
const SUCCESS_REMINDER_STATUSES = ['sent', 'mock_sent'];

const deadlineReminderInclude = {
  requiredDocuments: true,
  eligibilityCriteria: true,
  financialRequirements: true,
  technicalRequirements: true,
  checklistItems: { orderBy: { createdAt: 'asc' } },
  riskFlags: { orderBy: { createdAt: 'asc' } },
  companyFit: true,
  missingInformationItems: true,
};

function getDeadlineReminderWindow(referenceDate = new Date()) {
  const from = startOfDay(referenceDate);
  const to = endOfDay(addDays(referenceDate, REMINDER_WINDOW_DAYS));
  return { from, to };
}

async function findTendersDueSoon(referenceDate = new Date()) {
  const { from, to } = getDeadlineReminderWindow(referenceDate);

  return prisma.tender.findMany({
    where: {
      deadline: {
        gte: from,
        lte: to,
      },
    },
    include: deadlineReminderInclude,
    orderBy: { deadline: 'asc' },
  });
}

async function hasDeadlineReminderBeenSentToday(tenderId) {
  const since = startOfDay(new Date());

  const existing = await prisma.notificationLog.findFirst({
    where: {
      tenderId,
      type: 'deadline_reminder',
      status: { in: SUCCESS_REMINDER_STATUSES },
      createdAt: { gte: since },
    },
    select: { id: true },
  });

  return Boolean(existing);
}

async function dispatchDeadlineReminderForTender(tender, options = {}) {
  const {
    recipient,
    trigger = 'deadline_check',
    skipIfAlreadySent = true,
    writeAgentLogs = true,
  } = options;

  const result = {
    tenderId: tender.id,
    title: tender.title,
    action: null,
    status: null,
    skipped: false,
    reason: null,
  };

  if (!recipient?.trim()) {
    if (writeAgentLogs) {
      await createAgentActionLog(prisma, {
        tenderId: tender.id,
        actionType: AGENT_ACTION_TYPES.DEADLINE_CHECK_COMPLETED,
        title: 'Deadline reminder skipped',
        description: 'DEFAULT_NOTIFICATION_EMAIL is not set — generated review log only.',
        status: 'mock',
      });
    }

    result.action = 'email_skipped';
    result.reason = 'DEFAULT_NOTIFICATION_EMAIL missing';
    return result;
  }

  const to = recipient.trim();

  if (skipIfAlreadySent && (await hasDeadlineReminderBeenSentToday(tender.id))) {
    if (writeAgentLogs) {
      await createAgentActionLog(prisma, {
        tenderId: tender.id,
        actionType: AGENT_ACTION_TYPES.DEADLINE_REMINDER_DISPATCHED,
        title: 'Deadline reminder skipped (already sent today)',
        description: 'A reminder for this tender was already sent today.',
        status: 'skipped',
        metadata: { trigger, idempotent: true },
      });
    }

    result.action = 'reminder_skipped';
    result.skipped = true;
    result.reason = 'already_sent_today';
    return result;
  }

  try {
    const { subject: baseSubject } = buildTenderSummaryEmail(tender);
    const reminderSubject = `Reminder: deadline soon — ${baseSubject}`;
    const outcome = await sendTenderEmail({
      to,
      tender,
      subjectOverride: reminderSubject,
    });
    const notifStatus = outcome.status;

    await prisma.notificationLog.create({
      data: {
        tenderId: tender.id,
        type: 'deadline_reminder',
        recipient: to,
        subject: reminderSubject,
        status: notifStatus,
        message:
          notifStatus === 'mock_sent'
            ? outcome.message || 'Mock reminder'
            : 'Reminder dispatched',
      },
    });

    if (writeAgentLogs) {
      await createAgentActionLog(prisma, {
        tenderId: tender.id,
        actionType: AGENT_ACTION_TYPES.DEADLINE_REMINDER_DISPATCHED,
        title:
          notifStatus === 'sent'
            ? 'Deadline reminder email sent'
            : 'Deadline reminder email (mock)',
        description: outcome.message || null,
        status: notifStatus === 'sent' ? 'completed' : 'mock',
        metadata: { trigger, recipient: to },
      });
    }

    result.action = 'reminder_email';
    result.status = notifStatus;
    return result;
  } catch (e) {
    const msg = e.message || 'Unknown error';

    await prisma.notificationLog.create({
      data: {
        tenderId: tender.id,
        type: 'deadline_reminder',
        recipient: to,
        subject: `Reminder failed — ${tender.title}`,
        status: 'failed',
        message: msg,
      },
    });

    if (writeAgentLogs) {
      await createAgentActionLog(prisma, {
        tenderId: tender.id,
        actionType: AGENT_ACTION_TYPES.DEADLINE_REMINDER_DISPATCHED,
        title: 'Deadline reminder failed',
        description: msg,
        status: 'failed',
        metadata: { trigger },
      });
    }

    result.action = 'reminder_email_failed';
    result.status = 'failed';
    result.reason = msg;
    return result;
  }
}

async function processDeadlineReminders(options = {}) {
  const {
    trigger = 'deadline_check',
    writeAgentLogs = true,
    logSweepSummary = true,
  } = options;

  const { from, to } = getDeadlineReminderWindow();
  const tenders = await findTendersDueSoon();
  const recipient = env.DEFAULT_NOTIFICATION_EMAIL?.trim() || '';

  const actions = [];
  let remindersGenerated = 0;
  let remindersSkipped = 0;

  if (writeAgentLogs && logSweepSummary) {
    await createAgentActionLog(prisma, {
      tenderId: null,
      actionType: AGENT_ACTION_TYPES.DEADLINE_CHECK_COMPLETED,
      title: trigger === 'cron' ? 'Scheduled deadline check started' : 'Deadline check started',
      description: `Scanning tenders due between ${from.toISOString()} and ${to.toISOString()}.`,
      status: 'completed',
      metadata: { windowStart: from.toISOString(), windowEnd: to.toISOString(), trigger },
    });
  }

  for (const tender of tenders) {
    if (writeAgentLogs) {
      await createAgentActionLog(prisma, {
        tenderId: tender.id,
        actionType: AGENT_ACTION_TYPES.DEADLINE_CHECK_COMPLETED,
        title: 'Deadline check completed',
        description: `"${tender.title}" has a deadline inside the 2-day window.`,
        status: 'completed',
        metadata: { deadline: tender.deadline?.toISOString() ?? null, trigger },
      });
    }

    actions.push({
      tenderId: tender.id,
      title: tender.title,
      action: 'deadline_logged',
    });

    const outcome = await dispatchDeadlineReminderForTender(tender, {
      recipient,
      trigger,
      skipIfAlreadySent: true,
      writeAgentLogs,
    });

    if (outcome.skipped) {
      remindersSkipped += 1;
      actions.push({
        tenderId: tender.id,
        action: outcome.action,
        reason: outcome.reason,
      });
    } else if (outcome.action === 'reminder_email') {
      remindersGenerated += 1;
      actions.push({
        tenderId: tender.id,
        action: outcome.action,
        status: outcome.status,
      });
    } else if (outcome.action === 'reminder_email_failed') {
      actions.push({
        tenderId: tender.id,
        action: outcome.action,
        error: outcome.reason,
      });
    } else if (outcome.action === 'email_skipped') {
      actions.push({
        tenderId: tender.id,
        action: outcome.action,
        reason: outcome.reason,
      });
    }
  }

  if (writeAgentLogs && logSweepSummary) {
    await createAgentActionLog(prisma, {
      tenderId: null,
      actionType: AGENT_ACTION_TYPES.DEADLINE_CHECK_COMPLETED,
      title: trigger === 'cron' ? 'Scheduled deadline check finished' : 'Deadline check finished',
      description: `Reviewed ${tenders.length} tender(s); ${remindersGenerated} reminder(s) sent; ${remindersSkipped} skipped (already sent today).`,
      status: 'completed',
      metadata: {
        checkedTenders: tenders.length,
        remindersGenerated,
        remindersSkipped,
        trigger,
      },
    });
  }

  return {
    checkedTenders: tenders.length,
    remindersGenerated,
    remindersSkipped,
    actions,
  };
}

module.exports = {
  REMINDER_WINDOW_DAYS,
  deadlineReminderInclude,
  getDeadlineReminderWindow,
  findTendersDueSoon,
  hasDeadlineReminderBeenSentToday,
  dispatchDeadlineReminderForTender,
  processDeadlineReminders,
};
