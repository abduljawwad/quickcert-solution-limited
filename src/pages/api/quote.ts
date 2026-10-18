import type { APIRoute } from "astro";
import { handleApiRoute } from "../../lib/log";
import { DEAL_STAGE_QUOTE_REQUESTED } from "../../config/hubspot";
import { DEAL_TO_CONTACT, contactId, hubspotPost, hubspotToken, splitName } from "../../lib/hubspot";
import {
  isQuoteSlug,
  quoteNotSavedMessage,
  quoteRawFromStrings,
  quoteRawKeys,
  quoteSuccessMessage,
  validateQuote,
  type QuoteRaw,
  type QuoteRawKey,
  type ValidQuote,
} from "../../lib/quote";

export const prerender = false;

const MAX_BODY_CHARS = 32_768;

function slugForLog(serviceSlug: string): string {
  return isQuoteSlug(serviceSlug) ? serviceSlug : "unknown";
}

function json(
  status: number,
  body: {
    ok: boolean;
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

function stringsFromRecord(source: Record<string, unknown>): QuoteRaw {
  return quoteRawFromStrings((key: QuoteRawKey) => {
    const value = source[key];
    return typeof value === "string" ? value : "";
  });
}

async function readQuote(request: Request): Promise<QuoteRaw | undefined> {
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
    for (const key of quoteRawKeys) source[key] = params.get(key) ?? "";
    return stringsFromRecord(source);
  } catch {
    return undefined;
  }
}

async function saveQuote(
  token: string,
  quote: ValidQuote,
): Promise<{ ok: true } | { ok: false; status: number }> {
  const { firstname, lastname } = splitName(quote.name);
  const properties: Record<string, string> = {
    email: quote.email,
    firstname,
    phone: quote.phone,
    address: quote.address,
  };
  if (lastname) properties.lastname = lastname;

  const contact = await hubspotPost(
    token,
    "/crm/v3/objects/contacts/batch/upsert",
    {
      inputs: [
        {
          id: quote.email,
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

  const deal = await hubspotPost(
    token,
    "/crm/v3/objects/deals",
    {
      properties: {
        dealname: `${quote.serviceName} quote`,
        dealstage: DEAL_STAGE_QUOTE_REQUESTED,
        description: quote.description,
        service_slug: quote.serviceSlug,
        address: quote.address,
      },
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
    const raw = await readQuote(request);
    if (!raw) {
      return { response: json(400, { ok: false, message: "The form could not be read." }), outcome: "invalid" };
    }

    if (raw.company_website.trim()) {
      return {
        response: json(200, { ok: true, message: quoteSuccessMessage }),
        outcome: `honeypot service=${slugForLog(raw.service)}`,
      };
    }

    const parsed = validateQuote(raw);
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

    const token = hubspotToken();
    if (!token) {
      return {
        response: json(503, { ok: false, message: quoteNotSavedMessage() }),
        outcome: `unsaved service=${slugForLog(parsed.value.serviceSlug)}`,
      };
    }

    const saved = await saveQuote(token, parsed.value);
    if (!saved.ok) {
      return {
        response: json(502, { ok: false, message: quoteNotSavedMessage() }),
        outcome: `hubspot-error service=${slugForLog(parsed.value.serviceSlug)} status=${saved.status}`,
      };
    }

    return {
      response: json(200, { ok: true, message: quoteSuccessMessage }),
      outcome: `saved service=${slugForLog(parsed.value.serviceSlug)}`,
    };
  });
};
