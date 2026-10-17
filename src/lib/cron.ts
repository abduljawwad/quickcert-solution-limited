import { timingSafeEqual } from "node:crypto";

export function cronSecret(): string | undefined {
  const fromProcess = process.env["CRON_SECRET"];
  if (typeof fromProcess === "string" && fromProcess.trim()) return fromProcess.trim();
  const fromMeta = import.meta.env.CRON_SECRET;
  if (typeof fromMeta === "string" && fromMeta.trim()) return fromMeta.trim();
  return undefined;
}

function bearerToken(request: Request): string | undefined {
  const header = request.headers.get("authorization");
  if (!header) return undefined;
  const match = /^Bearer\s+(\S+)\s*$/i.exec(header.trim());
  const token = match?.[1];
  return token?.length ? token : undefined;
}

export function verifyCronBearer(request: Request, secret: string): boolean {
  const token = bearerToken(request);
  if (!token) return false;
  const expected = Buffer.from(secret, "utf8");
  const actual = Buffer.from(token, "utf8");
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}
