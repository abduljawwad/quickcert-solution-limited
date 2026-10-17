/** Absolute http(s) Google review URL, or undefined when config is not a usable link. */
export function googleReviewHref(value: string): string | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    return trimmed;
  } catch {
    return undefined;
  }
}
