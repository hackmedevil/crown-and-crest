/**
 * Sentry Client Configuration
 * Loads in the browser to capture client-side errors and exceptions
 */

module.exports = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || "development",
  enabled: !!(
    process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN
  ),
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0, // Capture 20% of transactions in production
  beforeSend(event) {
    // Strip any PII that might accidentally get attached
    if (event.user) {
      delete event.user.email;
      delete event.user.username;
      delete event.user.ip_address;
    }
    // Don't send events from localhost in development
    if (
      process.env.NODE_ENV === "development" &&
      event.request?.url?.includes("localhost")
    ) {
      return null;
    }
    return event;
  },
};
