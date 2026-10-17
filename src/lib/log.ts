import { captureRouteException } from "./sentry";

export function requestPath(request: Request): string {
  return new URL(request.url).pathname;
}

export function logApiRequest(fields: {
  method: string;
  path: string;
  status: number;
  durationMs: number;
  outcome: string;
}): void {
  const record = {
    time: new Date().toISOString(),
    method: fields.method,
    path: fields.path,
    status: fields.status,
    durationMs: fields.durationMs,
    outcome: fields.outcome,
  };
  const line = JSON.stringify(record);
  const isError =
    fields.status >= 500 ||
    fields.outcome.includes("hubspot-error") ||
    fields.outcome.startsWith("failed") ||
    fields.outcome === "exception";
  if (isError) console.error(line);
  else console.info(line);
}

export async function handleApiRoute(
  request: Request,
  fn: () => Promise<{ response: Response; outcome: string }>,
  onException?: () => Response,
): Promise<Response> {
  const started = Date.now();
  const method = request.method;
  const path = requestPath(request);

  try {
    const { response, outcome } = await fn();
    logApiRequest({
      method,
      path,
      status: response.status,
      durationMs: Date.now() - started,
      outcome,
    });
    return response;
  } catch (error) {
    captureRouteException(error);
    logApiRequest({
      method,
      path,
      status: 500,
      durationMs: Date.now() - started,
      outcome: "exception",
    });
    if (onException) return onException();
    return new Response(JSON.stringify({ ok: false, message: "Something went wrong." }), {
      status: 500,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }
}
