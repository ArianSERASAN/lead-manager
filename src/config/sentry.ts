import * as Sentry from '@sentry/react';

/**
 * Initialize Sentry error monitoring.
 * Reads DSN from environment variable VITE_SENTRY_DSN.
 * If empty or missing, Sentry is a no-op (safe for development).
 */
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.2,
    environment: import.meta.env.MODE,
  });
}

export { Sentry };
