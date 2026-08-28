const cron = require('node-cron');
const { env } = require('../config/env');
const { processDeadlineReminders } = require('./deadlineReminder.service');

//****** Cron — daily deadline reminders at 09:00 **************//

async function runDeadlineReminders() {
  if (!env.ENABLE_REMINDERS) {
    return { ran: false, reason: 'reminders_disabled' };
  }

  if (!env.DEFAULT_NOTIFICATION_EMAIL?.trim()) {
    console.warn('[reminder] DEFAULT_NOTIFICATION_EMAIL not set; skipping send.');
    return { ran: true, sent: 0, skippedNoRecipient: true };
  }

  const result = await processDeadlineReminders({
    trigger: 'cron',
    writeAgentLogs: true,
  });

  if (result.checkedTenders) {
    console.log(
      `[reminder] Processed ${result.checkedTenders} upcoming deadline(s), sent: ${result.remindersGenerated}, skipped: ${result.remindersSkipped}`,
    );
  }

  return {
    ran: true,
    tenderCount: result.checkedTenders,
    attempts: result.remindersGenerated,
    skipped: result.remindersSkipped,
  };
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
};
