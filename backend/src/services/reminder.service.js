const cron = require('node-cron');
const { env } = require('../config/env');
const { prisma } = require('../config/prisma');
const { startOfDay, endOfDay, addDays } = require('../utils/dateUtils');
const { sendTenderEmail, buildTenderSummaryEmail } = require('./email.service');

//****** Cron — deadline reminders (today … +2 days) **************//

async function findTendersDueSoon() {
  const now = new Date();
  const from = startOfDay(now);
  const to = endOfDay(addDays(now, 2));

  return prisma.tender.findMany({
    where: {
      deadline: {
        gte: from,
        lte: to,
      },
    },
    include: {
      requiredDocuments: true,
      eligibilityCriteria: true,
      financialRequirements: true,
      technicalRequirements: true,
      checklistItems: true,
      riskFlags: true,
      companyFit: true,
      missingInformationItems: true,
    },
    orderBy: { deadline: 'asc' },
  });
}

async function runDeadlineReminders() {
  if (!env.ENABLE_REMINDERS) {
    return { ran: false, reason: 'reminders_disabled' };
  }

  const recipient = env.DEFAULT_NOTIFICATION_EMAIL;
  if (!recipient) {
    console.warn('[reminder] DEFAULT_NOTIFICATION_EMAIL not set; skipping send.');
    return { ran: true, sent: 0, skippedNoRecipient: true };
  }

  const tenders = await findTendersDueSoon();
  let sent = 0;

  for (const tender of tenders) {
    try {
      const { subject: baseSubject } = buildTenderSummaryEmail(tender);
      const reminderSubject = `Reminder: deadline soon — ${baseSubject}`;
      const result = await sendTenderEmail({
        to: recipient,
        tender,
        subjectOverride: reminderSubject,
      });
      const status = result.status;

      await prisma.notificationLog.create({
        data: {
          tenderId: tender.id,
          type: 'deadline_reminder',
          recipient,
          subject: reminderSubject,
          status,
          message:
            status === 'mock_sent'
              ? result.message || 'Mock reminder'
              : 'Reminder dispatched',
        },
      });
      sent += 1;
    } catch (e) {
      console.error('[reminder] failed for tender', tender.id, e);
      await prisma.notificationLog.create({
        data: {
          tenderId: tender.id,
          type: 'deadline_reminder',
          recipient,
          subject: `Reminder failed — ${tender.title}`,
          status: 'failed',
          message: e.message || 'Unknown error',
        },
      });
    }
  }

  if (tenders.length) {
    console.log(`[reminder] Processed ${tenders.length} upcoming deadline(s), attempts: ${sent}`);
  }

  return { ran: true, tenderCount: tenders.length, attempts: sent };
}

function scheduleDailyReminders() {
  if (!env.ENABLE_REMINDERS) {
    console.log('[reminder] ENABLE_REMINDERS=false; cron not scheduled.');
    return null;
  }

  const job = cron.schedule('0 9 * * *', async () => {
    try {
      await runDeadlineReminders();
    } catch (e) {
      console.error('[reminder] cron run failed', e);
    }
  });

  console.log('[reminder] Scheduled daily reminders at 09:00 (server local time).');
  return job;
}

module.exports = {
  scheduleDailyReminders,
  runDeadlineReminders,
  findTendersDueSoon,
};
