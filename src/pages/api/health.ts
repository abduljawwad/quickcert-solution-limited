import type { APIRoute } from "astro";
import { handleApiRoute } from "../../lib/log";

export const prerender = false;

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
} as const;

function methodNotAllowed(): Response {
  return new Response(null, { status: 405, headers: { "cache-control": "no-store" } });
}

function withMethodLog(method: string): APIRoute {
  return ({ request }) =>
    handleApiRoute(request, async () => ({
      response: methodNotAllowed(),
      outcome: `method-not-allowed got=${method}`,
    }));
}

export const POST = withMethodLog("POST");
export const PUT = withMethodLog("PUT");
export const PATCH = withMethodLog("PATCH");
export const DELETE = withMethodLog("DELETE");
export const HEAD = withMethodLog("HEAD");
export const OPTIONS = withMethodLog("OPTIONS");

export const GET: APIRoute = ({ request }) =>
  handleApiRoute(request, async () => ({
    response: new Response(JSON.stringify({ ok: true }), { status: 200, headers: JSON_HEADERS }),
    outcome: "ok",
  }));
