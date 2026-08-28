const { processDeadlineReminders } = require('./deadlineReminder.service');

//****** Manual deadline check API **************//

async function runManualDeadlineCheck() {
  return processDeadlineReminders({
    trigger: 'deadline_check',
    writeAgentLogs: true,
  });
}

module.exports = {
  runManualDeadlineCheck,
};
