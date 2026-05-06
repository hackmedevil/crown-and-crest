/**
 * Centralized logger utility
 * Routes errors to Sentry (production) and console (all environments)
 * Replaces scattered console.error/warn calls throughout the app
 */

import * as Sentry from "@sentry/nextjs";

/**
 * Log context object for extra debugging information
 */
interface LogContext {
  userId?: string;
  endpoint?: string;
  cartId?: string;
  orderId?: string;
  productId?: string;
  [key: string]: any;
}

/**
 * Centralized logger with Sentry integration
 */
export const logger = {
  /**
   * Debug logs (dev environment only, won't send to Sentry)
   */
  debug: (msg: string, ctx?: LogContext): void => {
    if (process.env.NODE_ENV === "development") {
      console.debug(`[DEBUG] ${msg}`, ctx);
    }
  },

  /**
   * Info logs (console + Sentry)
   */
  info: (msg: string, ctx?: LogContext): void => {
    console.info(`[INFO] ${msg}`, ctx);
    if (typeof window === "undefined") {
      // Server-side
      Sentry.captureMessage(msg, "info");
      if (ctx) {
        Sentry.setContext("info", ctx);
      }
    }
  },

  /**
   * Warning logs (console + Sentry)
   */
  warn: (msg: string, ctx?: LogContext): void => {
    console.warn(`[WARN] ${msg}`, ctx);
    Sentry.captureMessage(msg, "warning");
    if (ctx) {
      Sentry.setContext("warning", ctx);
    }
  },

  /**
   * Error logs with full context (console + Sentry)
   * This is the recommended way to log errors throughout the app
   */
  error: (msg: string, err: Error, ctx?: LogContext): void => {
    console.error(`[ERROR] ${msg}`, err, ctx);
    Sentry.captureException(err, {
      level: "error",
      tags: {
        error_message: msg,
      },
      extra: ctx,
    });
  },

  /**
   * Fatal error - marks as critical in Sentry
   */
  fatal: (msg: string, err: Error, ctx?: LogContext): void => {
    console.error(`[FATAL] ${msg}`, err, ctx);
    Sentry.captureException(err, {
      level: "fatal",
      tags: {
        error_message: msg,
        severity: "critical",
      },
      extra: ctx,
    });
  },
};

/**
 * Helper to track API call errors
 */
export const logApiError = (
  endpoint: string,
  status: number,
  error: unknown
): void => {
  const err = error instanceof Error ? error : new Error(String(error));
  logger.error(`API Error [${status}]`, err, {
    endpoint,
    status,
  });
};

/**
 * Helper to track database errors
 */
export const logDatabaseError = (
  operation: string,
  table: string,
  error: unknown
): void => {
  const err = error instanceof Error ? error : new Error(String(error));
  logger.error(`Database Error`, err, {
    operation,
    table,
  });
};

/**
 * Helper to track authentication errors
 */
export const logAuthError = (reason: string, error: unknown): void => {
  const err = error instanceof Error ? error : new Error(String(error));
  logger.error(`Auth Error: ${reason}`, err, {
    reason,
  });
};

/**
 * Helper to track payment errors
 */
export const logPaymentError = (
  provider: string,
  orderId: string,
  error: unknown
): void => {
  const err = error instanceof Error ? error : new Error(String(error));
  logger.error(`Payment Error [${provider}]`, err, {
    provider,
    orderId,
  });
};
