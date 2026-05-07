require('./config/env');

//****** HTTP server + scheduled deadline reminders **************//

const app = require('./app');
const { env } = require('./config/env');
const { disconnectPrisma } = require('./config/prisma');
const { scheduleDailyReminders } = require('./services/reminder.service');

const server = app.listen(env.PORT, () => {
  console.log(`TenderPilot API listening on port ${env.PORT}`);
  scheduleDailyReminders();
});

async function gracefulShutdown(signal) {
  console.log(`${signal} received, shutting down...`);
  await disconnectPrisma();
  server.close(() => process.exit(0));
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
