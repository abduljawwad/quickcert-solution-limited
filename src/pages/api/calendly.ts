import type { APIRoute } from "astro";
import {
  calendlyEventName,
  calendlyInviteeEmail,
  calendlyScheduledEventStartTime,
  calendlySigningKey,
  verifyCalendlySignature,
} from "../../lib/calendly";
import { hubspotToken, markBookingDealBooked } from "../../lib/hubspot";
import { handleApiRoute } from "../../lib/log";

export const prerender = false;

const MAX_BODY_CHARS = 256_000;

type CalendlyOutcome =
  | "misconfigured"
  | "invalid-signature"
  | "replay"
  | "bad-body"
  | "hubspot-failed"
  | "booked"
  | "canceled"
  | "ignored";

function outcomeLabel(outcome: CalendlyOutcome, event: string): string {
  return `${outcome} event=${event || "unknown"}`;
}

function emptyResponse(status: number): Response {
  return new Response(null, {
    status,
    headers: {
      "cache-control": "no-store",
    },
  });
}

function methodNotAllowed(): Response {
  return emptyResponse(405);
}

function withMethodLog(method: string): APIRoute {
  return ({ request }) =>
    handleApiRoute(
      request,
      async () => ({
        response: methodNotAllowed(),
        outcome: `method-not-allowed got=${method}`,
      }),
      () => emptyResponse(500),
    );
}

export const GET = withMethodLog("GET");
export const HEAD = withMethodLog("HEAD");
export const PUT = withMethodLog("PUT");
export const PATCH = withMethodLog("PATCH");
export const DELETE = withMethodLog("DELETE");
export const OPTIONS = withMethodLog("OPTIONS");

export const POST: APIRoute = async ({ request }) => {
  return handleApiRoute(
    request,
    async () => {
      const signingKey = calendlySigningKey();
      if (!signingKey) {
        return { response: emptyResponse(503), outcome: outcomeLabel("misconfigured", "") };
      }

      let rawBody: string;
      try {
        rawBody = await request.text();
      } catch {
        return { response: emptyResponse(400), outcome: outcomeLabel("bad-body", "") };
      }

      if (rawBody.length > MAX_BODY_CHARS) {
        return { response: emptyResponse(400), outcome: outcomeLabel("bad-body", "") };
      }

      const signature = verifyCalendlySignature(
        request.headers.get("Calendly-Webhook-Signature"),
        rawBody,
        signingKey,
      );
      if (signature === "replay") {
        return { response: emptyResponse(401), outcome: outcomeLabel("replay", "") };
      }
      if (signature !== "ok") {
        return { response: emptyResponse(401), outcome: outcomeLabel("invalid-signature", "") };
      }

      let body: unknown;
      try {
        body = JSON.parse(rawBody) as unknown;
      } catch {
        return { response: emptyResponse(400), outcome: outcomeLabel("bad-body", "") };
      }

      const event = calendlyEventName(body) ?? "";

      if (event === "invitee.canceled") {
        return { response: emptyResponse(200), outcome: outcomeLabel("canceled", event) };
      }

      if (event !== "invitee.created") {
        return { response: emptyResponse(200), outcome: outcomeLabel("ignored", event) };
      }

      const email = calendlyInviteeEmail(body);
      if (!email) {
        return { response: emptyResponse(400), outcome: outcomeLabel("bad-body", event) };
      }

      const token = hubspotToken();
      if (!token) {
        return { response: emptyResponse(500), outcome: outcomeLabel("hubspot-failed", event) };
      }

      const visitStart = calendlyScheduledEventStartTime(body);
      const saved = await markBookingDealBooked(token, email, visitStart);
      if (!saved.ok) {
        return { response: emptyResponse(500), outcome: outcomeLabel("hubspot-failed", event) };
      }

      return { response: emptyResponse(200), outcome: outcomeLabel("booked", event) };
    },
    () => emptyResponse(500),
  );
};
