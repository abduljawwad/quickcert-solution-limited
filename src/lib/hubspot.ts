import {
  DEAL_STAGE_BOOKED,
  DEAL_STAGE_BOOKING_STARTED,
} from "../config/hubspot";

const HUBSPOT_ORIGIN = "https://api.hubapi.com";

export const DEAL_TO_CONTACT = 3;

/** HubSpot deal property: Calendly scheduled visit start (ISO 8601). */
export const DEAL_PROP_VISIT_START = "visit_start";

/** HubSpot deal property: set by the hourly job; HubSpot workflow sends the review email. */
export const DEAL_PROP_REVIEW_EMAIL_DUE = "review_email_due";

export function hubspotToken(): string | undefined {
  const fromProcess = process.env["HUBSPOT_TOKEN"];
  if (typeof fromProcess === "string" && fromProcess.trim()) return fromProcess.trim();
  const fromMeta = import.meta.env.HUBSPOT_TOKEN;
  if (typeof fromMeta === "string" && fromMeta.trim()) return fromMeta.trim();
  return undefined;
}

export function splitName(fullName: string): { firstname: string; lastname?: string } {
  const [firstname, ...rest] = fullName.split(" ");
  const lastname = rest.join(" ");
  return lastname ? { firstname, lastname } : { firstname };
}

export function contactId(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const results = (data as { results?: unknown }).results;
  if (!Array.isArray(results)) return undefined;
  const first: unknown = results[0];
  if (!first || typeof first !== "object") return undefined;
  const id = (first as { id?: unknown }).id;
  if (typeof id === "string" && id.trim()) return id.trim();
  if (typeof id === "number" && Number.isFinite(id)) return String(id);
  return undefined;
}

async function discard(response: Response): Promise<void> {
  await response.body?.cancel().catch(() => undefined);
}

async function hubspotFetch(
  token: string,
  path: string,
  init: RequestInit,
  readBody: boolean,
): Promise<{ ok: true; status: number; data: unknown } | { ok: false; status: number }> {
  let response: Response;
  try {
    response = await fetch(`${HUBSPOT_ORIGIN}${path}`, {
      redirect: "error",
      signal: AbortSignal.timeout(12_000),
      headers: {
        authorization: `Bearer ${token}`,
        accept: "application/json",
        ...(init.headers as Record<string, string> | undefined),
      },
      ...init,
    });
  } catch {
    return { ok: false, status: 0 };
  }

  if (!response.ok || response.status === 207) {
    await discard(response);
    return { ok: false, status: response.status };
  }

  if (!readBody) {
    await discard(response);
    return { ok: true, status: response.status, data: null };
  }

  try {
    const data: unknown = await response.json();
    return { ok: true, status: response.status, data };
  } catch {
    return { ok: false, status: response.status };
  }
}

export async function hubspotGet(
  token: string,
  path: string,
): Promise<{ ok: true; status: number; data: unknown } | { ok: false; status: number }> {
  return hubspotFetch(token, path, { method: "GET" }, true);
}

export async function hubspotPatch(
  token: string,
  path: string,
  body: unknown,
): Promise<{ ok: true; status: number } | { ok: false; status: number }> {
  const result = await hubspotFetch(
    token,
    path,
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
    false,
  );
  return result.ok ? { ok: true, status: result.status } : result;
}

function searchFirstId(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const results = (data as { results?: unknown }).results;
  if (!Array.isArray(results) || results.length === 0) return undefined;
  const first = results[0];
  if (!first || typeof first !== "object") return undefined;
  const id = (first as { id?: unknown }).id;
  if (typeof id === "string" && id.trim()) return id.trim();
  if (typeof id === "number" && Number.isFinite(id)) return String(id);
  return undefined;
}

function associationDealIds(data: unknown): string[] {
  if (!data || typeof data !== "object") return [];
  const results = (data as { results?: unknown }).results;
  if (!Array.isArray(results)) return [];
  const ids: string[] = [];
  for (const row of results) {
    if (!row || typeof row !== "object") continue;
    const toObjectId = (row as { toObjectId?: unknown }).toObjectId;
    if (typeof toObjectId === "number" && Number.isFinite(toObjectId)) {
      ids.push(String(toObjectId));
    } else if (typeof toObjectId === "string" && toObjectId.trim()) {
      ids.push(toObjectId.trim());
    }
  }
  return ids;
}

function dealStage(data: unknown, dealId: string): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const results = (data as { results?: unknown }).results;
  if (!Array.isArray(results)) return undefined;
  for (const row of results) {
    if (!row || typeof row !== "object") continue;
    const id = (row as { id?: unknown }).id;
    const idStr =
      typeof id === "string" ? id : typeof id === "number" && Number.isFinite(id) ? String(id) : "";
    if (idStr !== dealId) continue;
    const properties = (row as { properties?: unknown }).properties;
    if (!properties || typeof properties !== "object") return undefined;
    const stage = (properties as { dealstage?: unknown }).dealstage;
    return typeof stage === "string" ? stage : undefined;
  }
  return undefined;
}

function dealProperty(data: unknown, dealId: string, name: string): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const results = (data as { results?: unknown }).results;
  if (!Array.isArray(results)) return undefined;
  for (const row of results) {
    if (!row || typeof row !== "object") continue;
    const id = (row as { id?: unknown }).id;
    const idStr =
      typeof id === "string" ? id : typeof id === "number" && Number.isFinite(id) ? String(id) : "";
    if (idStr !== dealId) continue;
    const properties = (row as { properties?: unknown }).properties;
    if (!properties || typeof properties !== "object") return undefined;
    const value = (properties as Record<string, unknown>)[name];
    return typeof value === "string" ? value : undefined;
  }
  return undefined;
}

function searchResultIds(data: unknown): string[] {
  if (!data || typeof data !== "object") return [];
  const results = (data as { results?: unknown }).results;
  if (!Array.isArray(results)) return [];
  const ids: string[] = [];
  for (const row of results) {
    if (!row || typeof row !== "object") continue;
    const id = (row as { id?: unknown }).id;
    if (typeof id === "string" && id.trim()) ids.push(id.trim());
    else if (typeof id === "number" && Number.isFinite(id)) ids.push(String(id));
  }
  return ids;
}

function searchPagingAfter(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const paging = (data as { paging?: unknown }).paging;
  if (!paging || typeof paging !== "object") return undefined;
  const next = (paging as { next?: unknown }).next;
  if (!next || typeof next !== "object") return undefined;
  const after = (next as { after?: unknown }).after;
  return typeof after === "string" && after.trim() ? after.trim() : undefined;
}

/** Move an open booking deal for this email to the Booked stage. */
export async function markBookingDealBooked(
  token: string,
  email: string,
  visitStart?: string,
): Promise<{ ok: true } | { ok: false; status: number }> {
  const contactSearch = await hubspotPost(
    token,
    "/crm/v3/objects/contacts/search",
    {
      filterGroups: [
        {
          filters: [
            {
              propertyName: "email",
              operator: "EQ",
              value: email,
            },
          ],
        },
      ],
      properties: ["email"],
      limit: 1,
    },
    true,
  );
  if (!contactSearch.ok) return contactSearch;

  const contactIdValue = searchFirstId(contactSearch.data);
  if (!contactIdValue) return { ok: false, status: 404 };

  const associations = await hubspotGet(
    token,
    `/crm/v4/objects/contacts/${encodeURIComponent(contactIdValue)}/associations/deals`,
  );
  if (!associations.ok) return associations;

  const dealIds = associationDealIds(associations.data);
  if (dealIds.length === 0) return { ok: false, status: 404 };

  const dealsRead = await hubspotPost(
    token,
    "/crm/v3/objects/deals/batch/read",
    {
      properties: ["dealstage"],
      inputs: dealIds.map((id) => ({ id })),
    },
    true,
  );
  if (!dealsRead.ok) return dealsRead;

  let targetDealId: string | undefined;
  for (const id of dealIds) {
    const stage = dealStage(dealsRead.data, id);
    if (stage === DEAL_STAGE_BOOKING_STARTED || stage === DEAL_STAGE_BOOKED) {
      targetDealId = id;
      if (stage === DEAL_STAGE_BOOKING_STARTED) break;
    }
  }
  if (!targetDealId) return { ok: false, status: 404 };

  const stage = dealStage(dealsRead.data, targetDealId);
  if (stage === DEAL_STAGE_BOOKED) {
    if (visitStart) {
      const updated = await hubspotPatch(
        token,
        `/crm/v3/objects/deals/${encodeURIComponent(targetDealId)}`,
        {
          properties: {
            [DEAL_PROP_VISIT_START]: visitStart,
          },
        },
      );
      if (!updated.ok) return updated;
    }
    return { ok: true };
  }

  const properties: Record<string, string> = {
    dealstage: DEAL_STAGE_BOOKED,
  };
  if (visitStart) properties[DEAL_PROP_VISIT_START] = visitStart;

  const updated = await hubspotPatch(token, `/crm/v3/objects/deals/${encodeURIComponent(targetDealId)}`, {
    properties,
  });
  if (!updated.ok) return updated;
  return { ok: true };
}

/** Flag Booked deals whose visit was 24–48 hours ago for HubSpot review email workflow. */
export async function flagBookedDealsForReviewEmail(
  token: string,
): Promise<{ ok: true; count: number } | { ok: false; status: number }> {
  const now = Date.now();
  const msDay = 24 * 60 * 60 * 1000;
  const minVisitStart = now - 2 * msDay;
  const maxVisitStart = now - msDay;
  const flaggedAt = new Date(now).toISOString();

  let count = 0;
  let after: string | undefined;

  for (;;) {
    const searchBody: Record<string, unknown> = {
      filterGroups: [
        {
          filters: [
            { propertyName: "dealstage", operator: "EQ", value: DEAL_STAGE_BOOKED },
            { propertyName: DEAL_PROP_VISIT_START, operator: "GTE", value: String(minVisitStart) },
            { propertyName: DEAL_PROP_VISIT_START, operator: "LTE", value: String(maxVisitStart) },
            { propertyName: DEAL_PROP_REVIEW_EMAIL_DUE, operator: "NOT_HAS_PROPERTY" },
          ],
        },
      ],
      properties: ["dealstage", DEAL_PROP_VISIT_START, DEAL_PROP_REVIEW_EMAIL_DUE],
      limit: 100,
    };
    if (after) searchBody.after = after;

    const search = await hubspotPost(token, "/crm/v3/objects/deals/search", searchBody, true);
    if (!search.ok) return search;

    const dealIds = searchResultIds(search.data);
    for (const dealId of dealIds) {
      const existing = dealProperty(search.data, dealId, DEAL_PROP_REVIEW_EMAIL_DUE);
      if (existing?.trim()) continue;

      const updated = await hubspotPatch(token, `/crm/v3/objects/deals/${encodeURIComponent(dealId)}`, {
        properties: {
          [DEAL_PROP_REVIEW_EMAIL_DUE]: flaggedAt,
        },
      });
      if (!updated.ok) return updated;
      count += 1;
    }

    after = searchPagingAfter(search.data);
    if (!after) break;
  }

  return { ok: true, count };
}

export async function hubspotPost(
  token: string,
  path: string,
  body: unknown,
  readBody: boolean,
): Promise<{ ok: true; status: number; data: unknown } | { ok: false; status: number }> {
  return hubspotFetch(
    token,
    path,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
    readBody,
  );
}
