import * as Sentry from "@sentry/node";

let initialized = false;

const SENSITIVE_HEADER_NAMES = new Set([
  "authorization",
  "cookie",
  "calendly-webhook-signature",
]);

function readSentryDsn(): string | undefined {
  const fromProcess = process.env["SENTRY_DSN"];
  if (typeof fromProcess === "string") {
    const trimmed = fromProcess.trim();
    if (trimmed) {
      try {
        const url = new URL(trimmed);
        if (url.protocol === "http:" || url.protocol === "https:") return trimmed;
      } catch {
        return undefined;
      }
    }
  }
  const fromMeta = import.meta.env.SENTRY_DSN;
  if (typeof fromMeta === "string") {
    const trimmed = fromMeta.trim();
    if (trimmed) {
      try {
        const url = new URL(trimmed);
        if (url.protocol === "http:" || url.protocol === "https:") return trimmed;
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

function redactSentryEvent(event: Sentry.ErrorEvent): Sentry.ErrorEvent {
  if (event.request) {
    if (typeof event.request.url === "string") {
      try {
        const parsed = new URL(event.request.url);
        event.request.url = `${parsed.origin}${parsed.pathname}`;
      } catch {
        delete event.request.url;
      }
    }
    delete event.request.data;
    delete event.request.query_string;
    delete event.request.cookies;
    if (event.request.headers) {
      const headers: Record<string, string> = {};
      for (const [key, value] of Object.entries(event.request.headers)) {
        if (SENSITIVE_HEADER_NAMES.has(key.toLowerCase())) continue;
        if (typeof value === "string") headers[key] = value;
      }
      event.request.headers = headers;
    }
  }
  return event;
}

/** Server-only Sentry init when `SENTRY_DSN` is a non-empty URL. Safe no-op otherwise. */
export function initSentry(): void {
  if (initialized) return;
  initialized = true;

  const dsn = readSentryDsn();
  if (!dsn) return;

  Sentry.init({
    dsn,
    beforeSend(event) {
      return redactSentryEvent(event);
    },
  });
}

export function captureRouteException(error: unknown): void {
  if (!readSentryDsn()) return;
  initSentry();
  Sentry.captureException(error);
}

export function captureRouteMessage(message: string): void {
  if (!readSentryDsn()) return;
  initSentry();
  Sentry.captureMessage(message);
}
