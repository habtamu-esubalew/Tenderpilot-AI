require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

//****** Environment — dotenv; trimEnv for OAuth strings (no stray whitespace) **************//

const NODE_ENV = process.env.NODE_ENV || 'development';

function trimEnv(name) {
  const v = process.env[name];
  if (v == null) return '';
  return String(v).trim();
}

const env = {
  NODE_ENV,
  PORT: Number(process.env.PORT) || 5000,
  DATABASE_URL: process.env.DATABASE_URL || 'file:./dev.db',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',

  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',

  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY || '',
  SENDGRID_FROM_EMAIL: process.env.SENDGRID_FROM_EMAIL || '',
  DEFAULT_NOTIFICATION_EMAIL: process.env.DEFAULT_NOTIFICATION_EMAIL || '',

  GOOGLE_CLIENT_ID: trimEnv('GOOGLE_CLIENT_ID'),
  GOOGLE_CLIENT_SECRET: trimEnv('GOOGLE_CLIENT_SECRET'),
  GOOGLE_REDIRECT_URI: trimEnv('GOOGLE_REDIRECT_URI'),
  GOOGLE_REFRESH_TOKEN: trimEnv('GOOGLE_REFRESH_TOKEN'),

  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-2.5-flash',

  ENABLE_MOCK_AI: process.env.ENABLE_MOCK_AI === 'true',
  GEMINI_SILENT_FALLBACK:
    process.env.GEMINI_SILENT_FALLBACK === undefined
      ? false
      : process.env.GEMINI_SILENT_FALLBACK === 'true',
  GEMINI_RETRY_ON_429:
    process.env.GEMINI_RETRY_ON_429 === undefined
      ? true
      : process.env.GEMINI_RETRY_ON_429 === 'true',
  ENABLE_EMAIL: process.env.ENABLE_EMAIL === 'true',
  ENABLE_CALENDAR: process.env.ENABLE_CALENDAR === 'true',
  ENABLE_REMINDERS: process.env.ENABLE_REMINDERS !== 'false',
};

function shouldUseMockAi() {
  return env.ENABLE_MOCK_AI || !env.GEMINI_API_KEY;
}

function shouldSilentlyFallbackAfterGeminiError() {
  if (shouldUseMockAi()) return false;
  return env.GEMINI_SILENT_FALLBACK;
}

function hasSendGrid() {
  return env.ENABLE_EMAIL && Boolean(env.SENDGRID_API_KEY);
}

function hasGoogleCalendarOAuth() {
  return (
    env.ENABLE_CALENDAR &&
    Boolean(
      env.GOOGLE_CLIENT_ID &&
        env.GOOGLE_CLIENT_SECRET &&
        env.GOOGLE_REFRESH_TOKEN &&
        env.GOOGLE_REDIRECT_URI,
    )
  );
}

module.exports = {
  env,
  shouldUseMockAi,
  shouldSilentlyFallbackAfterGeminiError,
  hasSendGrid,
  hasGoogleCalendarOAuth,
};
