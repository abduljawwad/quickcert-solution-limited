import { business, type Service } from "../config/business";
import {
  quoteEmailPattern,
  quoteFields,
  quotePhoneDigits,
  quotePhonePattern,
} from "./quote";

export type BookableService = Extract<Service, { kind: "book" }>;

export const accessNoteField = {
  label: "Access note",
  hint: "Optional. For example, who has the keys.",
  max: 500,
} as const;

export const leadRawKeys = [
  "name",
  "email",
  "phone",
  "address",
  "access_note",
  "service",
  "company_website",
] as const;

export type LeadRawKey = (typeof leadRawKeys)[number];

export interface LeadRaw {
  name: string;
  email: string;
  phone: string;
  address: string;
  access_note: string;
  service: string;
  company_website: string;
}

export interface ValidLead {
  name: string;
  email: string;
  phone: string;
  address: string;
  accessNote: string;
  serviceSlug: string;
  serviceName: string;
  pricePence: number;
  calendlyUrl: string;
}

export type LeadField = "name" | "email" | "phone" | "address" | "access_note" | "service";

export interface LeadFieldError {
  ok: false;
  field: LeadField;
  message: string;
}

const emailPattern = new RegExp(quoteEmailPattern);
const phonePattern = new RegExp(quotePhonePattern);

function tooLong(label: string, max: number): string {
  return `${label} must be ${max} characters or fewer.`;
}

function bookableServices(): BookableService[] {
  return business.services.filter((service): service is BookableService => service.kind === "book");
}

export function isBookSlug(slug: string): boolean {
  return bookableServices().some((service) => service.slug === slug);
}

function hasDisallowedControls(value: string, allowNewlines: boolean): boolean {
  const pattern = allowNewlines
    ? /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/
    : /[\u0000-\u001F\u007F]/;
  return pattern.test(value);
}

export function leadRawFromStrings(read: (key: LeadRawKey) => string): LeadRaw {
  return {
    name: read("name"),
    email: read("email"),
    phone: read("phone"),
    address: read("address"),
    access_note: read("access_note"),
    service: read("service"),
    company_website: read("company_website"),
  };
}

export function leadCalendarMissingMessage(): string {
  return "This visit cannot be booked online until its calendar link is added.";
}

export function leadNotSavedMessage(): string {
  return "Your details were not saved. Try again.";
}

function calendarUrl(value: string): URL | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    return url;
  } catch {
    return undefined;
  }
}

export function isCalendarUrl(value: string): boolean {
  return calendarUrl(value) !== undefined;
}

export function calendlyRedirect(
  calendlyUrl: string,
  lead: Pick<ValidLead, "name" | "email" | "address" | "accessNote">,
): string | undefined {
  const url = calendarUrl(calendlyUrl);
  if (!url) return undefined;
  const params = new URLSearchParams(url.search);
  params.set("name", lead.name);
  params.set("email", lead.email);
  params.set("location", lead.address);
  if (lead.accessNote) params.set("a1", lead.accessNote);
  else params.delete("a1");
  params.delete("a2");
  url.search = params.toString();
  return url.toString();
}

export function validateLead(raw: LeadRaw): { ok: true; value: ValidLead } | LeadFieldError {
  const name = raw.name.trim().replace(/\s+/g, " ");
  if (!name) return { ok: false, field: "name", message: quoteFields.name.missing };
  if (name.length > quoteFields.name.max) {
    return { ok: false, field: "name", message: tooLong("Name", quoteFields.name.max) };
  }
  if (hasDisallowedControls(name, false)) {
    return { ok: false, field: "name", message: quoteFields.name.missing };
  }

  const email = raw.email.trim();
  if (!email) return { ok: false, field: "email", message: quoteFields.email.missing };
  if (email.length > quoteFields.email.max) {
    return { ok: false, field: "email", message: tooLong("Email", quoteFields.email.max) };
  }
  if (!emailPattern.test(email) || hasDisallowedControls(email, false)) {
    return { ok: false, field: "email", message: quoteFields.email.invalid };
  }

  const phone = raw.phone.trim();
  if (!phone) return { ok: false, field: "phone", message: quoteFields.phone.missing };
  if (phone.length > quoteFields.phone.max) {
    return { ok: false, field: "phone", message: tooLong("Phone", quoteFields.phone.max) };
  }
  const digits = phone.replace(/\D/g, "");
  if (
    !phonePattern.test(phone) ||
    digits.length < quotePhoneDigits.min ||
    digits.length > quotePhoneDigits.max ||
    hasDisallowedControls(phone, false)
  ) {
    return { ok: false, field: "phone", message: quoteFields.phone.invalid };
  }

  const address = raw.address.trim();
  if (!address) return { ok: false, field: "address", message: quoteFields.address.missing };
  if (address.length > quoteFields.address.max) {
    return {
      ok: false,
      field: "address",
      message: tooLong("Property address", quoteFields.address.max),
    };
  }
  if (hasDisallowedControls(address, true)) {
    return { ok: false, field: "address", message: quoteFields.address.missing };
  }

  const accessNote = raw.access_note.trim();
  if (accessNote.length > accessNoteField.max) {
    return {
      ok: false,
      field: "access_note",
      message: tooLong("Access note", accessNoteField.max),
    };
  }
  if (accessNote && hasDisallowedControls(accessNote, true)) {
    return {
      ok: false,
      field: "access_note",
      message: "Remove unusual characters from the access note.",
    };
  }

  const serviceSlug = raw.service.trim();
  if (!serviceSlug) return { ok: false, field: "service", message: "Service is required." };
  const service = bookableServices().find((item) => item.slug === serviceSlug);
  if (!service) return { ok: false, field: "service", message: "Service is not recognised." };

  return {
    ok: true,
    value: {
      name,
      email: email.toLowerCase(),
      phone,
      address,
      accessNote,
      serviceSlug: service.slug,
      serviceName: service.name,
      pricePence: service.pricePence,
      calendlyUrl: service.calendlyUrl,
    },
  };
}
