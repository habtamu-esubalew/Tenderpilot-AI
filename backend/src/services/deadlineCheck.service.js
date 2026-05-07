const { prisma } = require('../config/prisma');
const { env } = require('../config/env');
const { sendTenderEmail, buildTenderSummaryEmail } = require('./email.service');
const { createAgentActionLog, AGENT_ACTION_TYPES } = require('./agentAction.service');
const { startOfDay, endOfDay, addDays } = require('../utils/dateUtils');

//****** Deadline check API + reminder emails **************//

const deadlineCheckInclude = {
  requiredDocuments: true,
  eligibilityCriteria: true,
  financialRequirements: true,
  technicalRequirements: true,
  checklistItems: { orderBy: { createdAt: 'asc' } },
  riskFlags: { orderBy: { createdAt: 'asc' } },
};

async function runManualDeadlineCheck() {
  const now = new Date();
  const from = startOfDay(now);
  const to = endOfDay(addDays(now, 2));

  const tenders = await prisma.tender.findMany({
    where: {
      deadline: {
        gte: from,
        lte: to,
      },
    },
    include: deadlineCheckInclude,
    orderBy: { deadline: 'asc' },
  });

  const actions = [];
  let remindersGenerated = 0;
  const recipient = env.DEFAULT_NOTIFICATION_EMAIL?.trim();

  await createAgentActionLog(prisma, {
    tenderId: null,
    actionType: AGENT_ACTION_TYPES.DEADLINE_CHECK_COMPLETED,
    title: 'Deadline check started',
    description: `Scanning tenders due between ${from.toISOString()} and ${to.toISOString()}.`,
    status: 'completed',
    metadata: { windowStart: from.toISOString(), windowEnd: to.toISOString() },
  });

  for (const tender of tenders) {
    await createAgentActionLog(prisma, {
      tenderId: tender.id,
      actionType: AGENT_ACTION_TYPES.DEADLINE_CHECK_COMPLETED,
      title: 'Deadline check completed',
      description: `"${tender.title}" has a deadline inside the 2-day window.`,
      status: 'completed',
      metadata: { deadline: tender.deadline?.toISOString() ?? null },
    });
    actions.push({
      tenderId: tender.id,
      title: tender.title,
      action: 'deadline_logged',
    });

    if (recipient) {
      try {
        const { subject: baseSubject } = buildTenderSummaryEmail(tender);
        const reminderSubject = `Reminder: deadline soon — ${baseSubject}`;
        const outcome = await sendTenderEmail({
          to: recipient,
          tender,
          subjectOverride: reminderSubject,
        });
        const notifStatus = outcome.status;

        await prisma.notificationLog.create({
          data: {
            tenderId: tender.id,
            type: 'deadline_reminder',
            recipient,
            subject: reminderSubject,
            status: notifStatus,
            message:
              notifStatus === 'mock_sent'
                ? outcome.message || 'Mock reminder'
                : 'Reminder dispatched',
          },
        });

        remindersGenerated += 1;

        await createAgentActionLog(prisma, {
          tenderId: tender.id,
          actionType: AGENT_ACTION_TYPES.DEADLINE_REMINDER_DISPATCHED,
          title:
            notifStatus === 'sent'
              ? 'Deadline reminder email sent'
              : 'Deadline reminder email (mock)',
          description: outcome.message || null,
          status: notifStatus === 'sent' ? 'completed' : 'mock',
          metadata: { trigger: 'deadline_check', recipient },
        });

        actions.push({
          tenderId: tender.id,
          action: 'reminder_email',
          status: notifStatus,
        });
      } catch (e) {
        const msg = e.message || 'Unknown error';
        await prisma.notificationLog.create({
          data: {
            tenderId: tender.id,
            type: 'deadline_reminder',
            recipient,
            subject: `Reminder failed — ${tender.title}`,
            status: 'failed',
            message: msg,
          },
        });
        await createAgentActionLog(prisma, {
          tenderId: tender.id,
          actionType: AGENT_ACTION_TYPES.DEADLINE_REMINDER_DISPATCHED,
          title: 'Deadline reminder failed',
          description: msg,
          status: 'failed',
          metadata: { trigger: 'deadline_check' },
        });
        actions.push({
          tenderId: tender.id,
          action: 'reminder_email_failed',
          error: msg,
        });
      }
    } else {
      await createAgentActionLog(prisma, {
        tenderId: tender.id,
        actionType: AGENT_ACTION_TYPES.DEADLINE_CHECK_COMPLETED,
        title: 'Deadline reminder skipped',
        description: 'DEFAULT_NOTIFICATION_EMAIL is not set — generated review log only.',
        status: 'mock',
      });
      actions.push({
        tenderId: tender.id,
        action: 'email_skipped',
        reason: 'DEFAULT_NOTIFICATION_EMAIL missing',
      });
    }
  }

  await createAgentActionLog(prisma, {
    tenderId: null,
    actionType: AGENT_ACTION_TYPES.DEADLINE_CHECK_COMPLETED,
    title: 'Deadline check finished',
    description: `Reviewed ${tenders.length} tender(s); ${remindersGenerated} reminder attempt(s).`,
    status: 'completed',
    metadata: {
      checkedTenders: tenders.length,
      remindersGenerated,
    },
  });

  return {
    checkedTenders: tenders.length,
    remindersGenerated,
    actions,
  };
}

module.exports = {
  runManualDeadlineCheck,
};
