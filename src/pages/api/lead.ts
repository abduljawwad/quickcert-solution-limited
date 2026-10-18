import type { APIRoute } from "astro";
import { handleApiRoute } from "../../lib/log";
import { DEAL_STAGE_BOOKING_STARTED } from "../../config/hubspot";
import { DEAL_TO_CONTACT, contactId, hubspotPost, hubspotToken, splitName } from "../../lib/hubspot";
import {
  calendlyRedirect,
  isBookSlug,
  leadCalendarMissingMessage,
  leadRawFromStrings,
  leadRawKeys,
  validateLead,
  type LeadRaw,
  type LeadRawKey,
  type ValidLead,
} from "../../lib/lead";

export const prerender = false;

const MAX_BODY_CHARS = 32_768;

const honeypotMessage = "Thank you.";

function slugForLog(serviceSlug: string): string {
  return isBookSlug(serviceSlug) ? serviceSlug : "unknown";
}

function json(
  status: number,
  body:
    | { ok: true; redirect: string }
    | { ok: true; message: string }
    | {
        ok: false;
        message: string;
        field?: string;
        errors?: { field: string; message: string }[];
      },
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function stringsFromRecord(source: Record<string, unknown>): LeadRaw {
  return leadRawFromStrings((key: LeadRawKey) => {
    const value = source[key];
    return typeof value === "string" ? value : "";
  });
}

async function readLead(request: Request): Promise<LeadRaw | undefined> {
  let text: string;
  try {
    text = await request.text();
  } catch {
    return undefined;
  }
  if (text.length > MAX_BODY_CHARS) return undefined;

  const contentType = request.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json") || text.trim().startsWith("{")) {
      const data: unknown = JSON.parse(text);
      if (!data || typeof data !== "object" || Array.isArray(data)) return undefined;
      return stringsFromRecord(data as Record<string, unknown>);
    }

    const params = new URLSearchParams(text);
    const source: Record<string, unknown> = {};
    for (const key of leadRawKeys) source[key] = params.get(key) ?? "";
    return stringsFromRecord(source);
  } catch {
    return undefined;
  }
}

async function saveLead(
  token: string,
  lead: ValidLead,
): Promise<{ ok: true } | { ok: false; status: number }> {
  const { firstname, lastname } = splitName(lead.name);
  const properties: Record<string, string> = {
    email: lead.email,
    firstname,
    phone: lead.phone,
    address: lead.address,
  };
  if (lastname) properties.lastname = lastname;

  const contact = await hubspotPost(
    token,
    "/crm/v3/objects/contacts/batch/upsert",
    {
      inputs: [
        {
          id: lead.email,
          idProperty: "email",
          properties,
        },
      ],
    },
    true,
  );
  if (!contact.ok) return contact;

  const id = contactId(contact.data);
  if (!id) return { ok: false, status: contact.status };

  const dealProperties: Record<string, string> = {
    dealname: `${lead.serviceName} booking`,
    dealstage: DEAL_STAGE_BOOKING_STARTED,
    service_slug: lead.serviceSlug,
    price_pence: String(lead.pricePence),
    address: lead.address,
  };
  if (lead.accessNote) dealProperties.access_note = lead.accessNote;

  const deal = await hubspotPost(
    token,
    "/crm/v3/objects/deals",
    {
      properties: dealProperties,
      associations: [
        {
          to: { id: /^\d+$/.test(id) ? Number(id) : id },
          types: [
            {
              associationCategory: "HUBSPOT_DEFINED",
              associationTypeId: DEAL_TO_CONTACT,
            },
          ],
        },
      ],
    },
    false,
  );
  if (!deal.ok) return deal;
  return { ok: true };
}

export const POST: APIRoute = async ({ request }) => {
  return handleApiRoute(request, async () => {
    const raw = await readLead(request);
    if (!raw) {
      return { response: json(400, { ok: false, message: "The form could not be read." }), outcome: "invalid" };
    }

    if (raw.company_website.trim()) {
      return {
        response: json(200, { ok: true, message: honeypotMessage }),
        outcome: `honeypot service=${slugForLog(raw.service)}`,
      };
    }

    const parsed = validateLead(raw);
    if (!parsed.ok) {
      return {
        response: json(400, {
          ok: false,
          message: parsed.message,
          field: parsed.field,
          errors: parsed.errors,
        }),
        outcome: `invalid service=${slugForLog(raw.service)}`,
      };
    }

    const redirect = calendlyRedirect(parsed.value.calendlyUrl, parsed.value);
    if (!redirect) {
      return {
        response: json(409, { ok: false, message: leadCalendarMissingMessage() }),
        outcome: `no-calendar service=${slugForLog(parsed.value.serviceSlug)}`,
      };
    }

    const token = hubspotToken();
    if (!token) {
      return {
        response: json(200, { ok: true, redirect }),
        outcome: `hubspot-skipped service=${slugForLog(parsed.value.serviceSlug)}`,
      };
    }

    const saved = await saveLead(token, parsed.value);
    if (!saved.ok) {
      return {
        response: json(200, { ok: true, redirect }),
        outcome: `hubspot-error service=${slugForLog(parsed.value.serviceSlug)} status=${saved.status}`,
      };
    }

    return {
      response: json(200, { ok: true, redirect }),
      outcome: `redirect service=${slugForLog(parsed.value.serviceSlug)}`,
    };
  });
};
