import type { APIRoute } from "astro";
import { cronSecret, verifyCronBearer } from "../../../lib/cron";
import { flagBookedDealsForReviewEmail, hubspotToken } from "../../../lib/hubspot";
import { handleApiRoute } from "../../../lib/log";
import { captureRouteMessage } from "../../../lib/sentry";

export const prerender = false;

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
} as const;

function json(status: number, body: { ok: boolean; count: number }): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function emptyResponse(status: number): Response {
  return new Response(null, { status, headers: { "cache-control": "no-store" } });
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
export const PUT = withMethodLog("PUT");
export const PATCH = withMethodLog("PATCH");
export const DELETE = withMethodLog("DELETE");
export const HEAD = withMethodLog("HEAD");
export const OPTIONS = withMethodLog("OPTIONS");

export const POST: APIRoute = async ({ request }) => {
  return handleApiRoute(
    request,
    async () => {
      const secret = cronSecret();
      if (!secret) {
        return { response: emptyResponse(503), outcome: "misconfigured" };
      }

      if (!verifyCronBearer(request, secret)) {
        return { response: emptyResponse(401), outcome: "unauthorized" };
      }

      const token = hubspotToken();
      if (!token) {
        return { response: json(200, { ok: true, count: 0 }), outcome: "skipped count=0" };
      }

      const result = await flagBookedDealsForReviewEmail(token);
      if (!result.ok) {
        captureRouteMessage(`review-email failed status=${result.status}`);
        return { response: emptyResponse(500), outcome: `failed status=${result.status}` };
      }

      return {
        response: json(200, { ok: true, count: result.count }),
        outcome: `flagged count=${result.count}`,
      };
    },
    () => emptyResponse(500),
  );
};
