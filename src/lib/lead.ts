import { business, type Service } from "../config/business";
import { addressPartKeys, validateAddressParts, type AddressPartKey } from "./address";
import { customerTextError } from "./customer-text";
import { accessNoteError } from "./fields";
import { quoteFields } from "./quote";

export type BookableService = Extract<Service, { kind: "book" }>;

export { accessNoteField } from "./fields";

export const leadRawKeys = [
  "name",
  "email",
  "phone",
  ...addressPartKeys,
  "access_note",
  "service",
  "company_website",
] as const;

export type LeadRawKey = (typeof leadRawKeys)[number];

export interface LeadRaw {
  name: string;
  email: string;
  phone: string;
  number: string;
  street: string;
  city: string;
  postcode: string;
  access_note: string;
  service: string;
  company_website: string;
}

export interface ValidLead {
  name: string;
  email: string;
  phone: string;
  /** Full line from propertyAddressLine: number street, city, postcode. */
  address: string;
  accessNote: string;
  serviceSlug: string;
  serviceName: string;
  pricePence: number;
  calendlyUrl: string;
}

export type LeadField =
  | "name"
  | "email"
  | "phone"
  | AddressPartKey
  | "access_note"
  | "service";

export interface LeadFieldError {
  ok: false;
  field: LeadField;
  message: string;
  errors: { field: LeadField; message: string }[];
}

function tooLong(label: string, max: number): string {
  return `${label} must be ${max} characters or fewer.`;
}

function bookableServices(): BookableService[] {
  return business.services.filter((service): service is BookableService => service.kind === "book");
}

export function isBookSlug(slug: string): boolean {
  return bookableServices().some((service) => service.slug === slug);
}

export function leadRawFromStrings(read: (key: LeadRawKey) => string): LeadRaw {
  return {
    name: read("name"),
    email: read("email"),
    phone: read("phone"),
    number: read("number"),
    street: read("street"),
    city: read("city"),
    postcode: read("postcode"),
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
  const errors: { field: LeadField; message: string }[] = [];

  const name = raw.name.trim().replace(/\s+/g, " ");
  if (!name) errors.push({ field: "name", message: quoteFields.name.missing });
  else if (name.length > quoteFields.name.max) {
    errors.push({ field: "name", message: tooLong("Name", quoteFields.name.max) });
  } else {
    const character = customerTextError("name", name);
    if (character) errors.push({ field: "name", message: character });
  }

  const email = raw.email.trim();
  if (!email) errors.push({ field: "email", message: quoteFields.email.missing });
  else if (email.length > quoteFields.email.max) {
    errors.push({ field: "email", message: tooLong("Email", quoteFields.email.max) });
  } else {
    const character = customerTextError("email", email);
    if (character) errors.push({ field: "email", message: character });
  }

  const phone = raw.phone.trim();
  if (!phone) errors.push({ field: "phone", message: quoteFields.phone.missing });
  else if (phone.length > quoteFields.phone.max) {
    errors.push({ field: "phone", message: tooLong("Phone", quoteFields.phone.max) });
  } else {
    const character = customerTextError("phone", phone);
    if (character) errors.push({ field: "phone", message: character });
  }

  const address = validateAddressParts({
    number: raw.number,
    street: raw.street,
    city: raw.city,
    postcode: raw.postcode,
  });
  if (!address.ok) errors.push(...address.errors);

  const accessNote = raw.access_note.trim();
  const accessMessage = accessNoteError(raw.access_note);
  if (accessMessage) errors.push({ field: "access_note", message: accessMessage });

  const serviceSlug = raw.service.trim();
  const service = bookableServices().find((item) => item.slug === serviceSlug);
  if (!serviceSlug) errors.push({ field: "service", message: "Service is required." });
  else if (!service) errors.push({ field: "service", message: "Service is not recognised." });

  if (errors.length > 0) {
    const first = errors[0] ?? { field: "name" as const, message: quoteFields.name.missing };
    return { ok: false, field: first.field, message: first.message, errors };
  }
  if (!address.ok || !service) {
    const fallback = { field: "name" as const, message: quoteFields.name.missing };
    return { ok: false, field: fallback.field, message: fallback.message, errors: [fallback] };
  }

  return {
    ok: true,
    value: {
      name,
      email: email.toLowerCase(),
      phone,
      address: address.line,
      accessNote,
      serviceSlug: service.slug,
      serviceName: service.name,
      pricePence: service.pricePence,
      calendlyUrl: service.calendlyUrl,
    },
  };
}
