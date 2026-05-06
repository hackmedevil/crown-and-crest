/**
 * Sentry Server Configuration
 * Loads on the Node.js server to capture server-side errors
 */

module.exports = {
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || "development",
  enabled: !!process.env.SENTRY_DSN, // Only enable if DSN is set
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0, // Capture 20% of transactions in production
  beforeSend(event) {
    // Strip any PII that might accidentally get attached
    if (event.user) {
      delete event.user.email;
      delete event.user.username;
      delete event.user.ip_address;
    }
    return event;
  },
  integrations: [
    // Additional integrations can be added here
    // (e.g., Sentry's database integration, http integration, etc.)
  ],
};
