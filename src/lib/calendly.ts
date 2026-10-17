import { createHmac, timingSafeEqual } from "node:crypto";

const MAX_SKEW_SECONDS = 3 * 60;

export function calendlySigningKey(): string | undefined {
  const fromProcess = process.env["CALENDLY_WEBHOOK_SIGNING_KEY"];
  if (typeof fromProcess === "string" && fromProcess.trim()) return fromProcess.trim();
  const fromMeta = import.meta.env.CALENDLY_WEBHOOK_SIGNING_KEY;
  if (typeof fromMeta === "string" && fromMeta.trim()) return fromMeta.trim();
  return undefined;
}

type SignatureParts = { timestamp: string; digest: string };

function parseSignatureHeader(header: string): SignatureParts | undefined {
  let timestamp: string | undefined;
  let digest: string | undefined;

  for (const part of header.split(",")) {
    const piece = part.trim();
    if (piece.startsWith("t=")) timestamp = piece.slice(2);
    else if (piece.startsWith("v1=")) digest = piece.slice(3);
  }

  if (!timestamp || !digest || !/^\d+$/.test(timestamp) || !/^[0-9a-f]+$/i.test(digest)) {
    return undefined;
  }
  return { timestamp, digest: digest.toLowerCase() };
}

export type CalendlySignatureResult = "ok" | "invalid" | "replay";

export function verifyCalendlySignature(
  header: string | null,
  rawBody: string,
  signingKey: string,
): CalendlySignatureResult {
  if (!header) return "invalid";
  const parts = parseSignatureHeader(header);
  if (!parts) return "invalid";

  const unix = Number(parts.timestamp);
  if (!Number.isFinite(unix)) return "invalid";
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - unix) > MAX_SKEW_SECONDS) return "replay";

  const expected = createHmac("sha256", signingKey)
    .update(`${parts.timestamp}.${rawBody}`)
    .digest("hex");

  const expectedBuf = Buffer.from(expected, "utf8");
  const actualBuf = Buffer.from(parts.digest, "utf8");
  if (expectedBuf.length !== actualBuf.length) return "invalid";
  if (!timingSafeEqual(expectedBuf, actualBuf)) return "invalid";

  return "ok";
}

export function calendlyEventName(body: unknown): string | undefined {
  if (!body || typeof body !== "object" || Array.isArray(body)) return undefined;
  const event = (body as { event?: unknown }).event;
  return typeof event === "string" && event.trim() ? event.trim() : undefined;
}

export function calendlyInviteeEmail(body: unknown): string | undefined {
  if (!body || typeof body !== "object" || Array.isArray(body)) return undefined;
  const payload = (body as { payload?: unknown }).payload;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return undefined;
  const email = (payload as { email?: unknown }).email;
  return typeof email === "string" && email.trim() ? email.trim().toLowerCase() : undefined;
}

/** ISO 8601 start time from payload.scheduled_event.start_time when present. */
export function calendlyScheduledEventStartTime(body: unknown): string | undefined {
  if (!body || typeof body !== "object" || Array.isArray(body)) return undefined;
  const payload = (body as { payload?: unknown }).payload;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return undefined;
  const scheduledEvent = (payload as { scheduled_event?: unknown }).scheduled_event;
  if (!scheduledEvent || typeof scheduledEvent !== "object" || Array.isArray(scheduledEvent)) {
    return undefined;
  }
  const startTime = (scheduledEvent as { start_time?: unknown }).start_time;
  return typeof startTime === "string" && startTime.trim() ? startTime.trim() : undefined;
}
