/** Shared by POST /api/lead and POST /api/quote. Keyed by Astro clientAddress, not a forwarded header. */
const maxRequests = 8;
const windowMs = 10 * 60 * 1000;

export const formRateLimit = { maxRequests, windowMs } as const;

export const formRateLimitMessage = "Please wait a few minutes and try again.";

const bucketsKey = Symbol.for("quickcert.formRateLimit");

type BucketGlobal = typeof globalThis & {
  [key: symbol]: Map<string, number[]> | undefined;
};

function buckets(): Map<string, number[]> {
  const scope = globalThis as BucketGlobal;
  const existing = scope[bucketsKey];
  if (existing instanceof Map) return existing;
  const created = new Map<string, number[]>();
  scope[bucketsKey] = created;
  return created;
}

function clientAddressFrom(source: { clientAddress: string }): string {
  try {
    const address = source.clientAddress;
    return typeof address === "string" ? address.trim() : "";
  } catch {
    return "";
  }
}

function sweep(map: Map<string, number[]>, now: number): void {
  for (const [key, stamps] of map) {
    const recent = stamps.filter((stamp) => now - stamp < windowMs);
    if (recent.length === 0) map.delete(key);
    else map.set(key, recent);
  }
}

/** True when this post is still inside the shared per-address limit. */
export function withinFormRateLimit(source: { clientAddress: string }): boolean {
  const now = Date.now();
  const key = clientAddressFrom(source) || "unknown";
  const map = buckets();
  const recent = (map.get(key) ?? []).filter((stamp) => now - stamp < windowMs);
  if (recent.length >= maxRequests) {
    map.set(key, recent);
    return false;
  }
  recent.push(now);
  map.set(key, recent);
  if (map.size > 1024) sweep(map, now);
  return true;
}
