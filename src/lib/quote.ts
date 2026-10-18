import { business, type Service } from "../config/business";
import { addressPartKeys, validateAddressParts, type AddressPartKey } from "./address";

export type QuoteService = Extract<Service, { kind: "quote" }>;

export const quoteSuccessMessage =
  "We reply within one working day with a written price before any payment.";

export function quoteNotSavedMessage(): string {
  return `Your enquiry was not saved. Call ${business.phoneDisplay}.`;
}

export const quoteEmailPattern = "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$";
export const quotePhonePattern = "^[+0-9\\s().-]+$";
export const quotePhoneDigits = { min: 8, max: 15 } as const;

export const quoteFields = {
  name: {
    label: "Name",
    autocomplete: "name",
    max: 100,
    missing: "Enter your name.",
  },
  email: {
    label: "Email",
    autocomplete: "email",
    max: 254,
    missing: "Enter your email.",
    invalid: "Enter a valid email address.",
  },
  phone: {
    label: "Phone",
    autocomplete: "tel",
    max: 30,
    missing: "Enter your phone number.",
    invalid: "Enter a valid phone number.",
  },
  description: {
    max: 2000,
  },
} as const;

/** Label and empty-field error for the quote description, named for that service. */
export function quoteDescriptionCopy(serviceSlug: string): { label: string; missing: string } {
  const work =
    serviceSlug === "electrical"
      ? "electrical"
      : serviceSlug === "plumbing"
        ? "plumbing"
        : undefined;
  const label = work
    ? `Describe the ${work} work that you want done`
    : "Describe the work that you want done";
  return { label, missing: `${label}.` };
}

export const quoteRawKeys = [
  "name",
  "email",
  "phone",
  ...addressPartKeys,
  "description",
  "service",
  "company_website",
] as const;

export type QuoteRawKey = (typeof quoteRawKeys)[number];

export interface QuoteRaw {
  name: string;
  email: string;
  phone: string;
  number: string;
  street: string;
  city: string;
  postcode: string;
  description: string;
  service: string;
  company_website: string;
}

export interface ValidQuote {
  name: string;
  email: string;
  phone: string;
  /** Full line from propertyAddressLine: number street, city, postcode. */
  address: string;
  description: string;
  serviceSlug: string;
  serviceName: string;
}

export type QuoteField =
  | "name"
  | "email"
  | "phone"
  | AddressPartKey
  | "description"
  | "service";

export interface QuoteFieldError {
  ok: false;
  field: QuoteField;
  message: string;
  errors: { field: QuoteField; message: string }[];
}

const emailPattern = new RegExp(quoteEmailPattern);
const phonePattern = new RegExp(quotePhonePattern);

function tooLong(label: string, max: number): string {
  return `${label} must be ${max} characters or fewer.`;
}

function quoteServiceList(): QuoteService[] {
  return business.services.filter((service): service is QuoteService => service.kind === "quote");
}

export function isQuoteSlug(slug: string): boolean {
  return quoteServiceList().some((service) => service.slug === slug);
}

function hasDisallowedControls(value: string, allowNewlines: boolean): boolean {
  const pattern = allowNewlines
    ? /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/
    : /[\u0000-\u001F\u007F]/;
  return pattern.test(value);
}

export function quoteRawFromStrings(read: (key: QuoteRawKey) => string): QuoteRaw {
  return {
    name: read("name"),
    email: read("email"),
    phone: read("phone"),
    number: read("number"),
    street: read("street"),
    city: read("city"),
    postcode: read("postcode"),
    description: read("description"),
    service: read("service"),
    company_website: read("company_website"),
  };
}

export function validateQuote(raw: QuoteRaw): { ok: true; value: ValidQuote } | QuoteFieldError {
  const errors: { field: QuoteField; message: string }[] = [];

  const name = raw.name.trim().replace(/\s+/g, " ");
  if (!name) errors.push({ field: "name", message: quoteFields.name.missing });
  else if (name.length > quoteFields.name.max) {
    errors.push({ field: "name", message: tooLong("Name", quoteFields.name.max) });
  } else if (hasDisallowedControls(name, false)) {
    errors.push({ field: "name", message: quoteFields.name.missing });
  }

  const email = raw.email.trim();
  if (!email) errors.push({ field: "email", message: quoteFields.email.missing });
  else if (email.length > quoteFields.email.max) {
    errors.push({ field: "email", message: tooLong("Email", quoteFields.email.max) });
  } else if (!emailPattern.test(email) || hasDisallowedControls(email, false)) {
    errors.push({ field: "email", message: quoteFields.email.invalid });
  }

  const phone = raw.phone.trim();
  const digits = phone.replace(/\D/g, "");
  if (!phone) errors.push({ field: "phone", message: quoteFields.phone.missing });
  else if (phone.length > quoteFields.phone.max) {
    errors.push({ field: "phone", message: tooLong("Phone", quoteFields.phone.max) });
  } else if (
    !phonePattern.test(phone) ||
    digits.length < quotePhoneDigits.min ||
    digits.length > quotePhoneDigits.max ||
    hasDisallowedControls(phone, false)
  ) {
    errors.push({ field: "phone", message: quoteFields.phone.invalid });
  }

  const address = validateAddressParts({
    number: raw.number,
    street: raw.street,
    city: raw.city,
    postcode: raw.postcode,
  });
  if (!address.ok) errors.push(...address.errors);

  const description = raw.description.trim();
  const descriptionCopy = quoteDescriptionCopy(raw.service.trim());
  if (!description) errors.push({ field: "description", message: descriptionCopy.missing });
  else if (description.length > quoteFields.description.max) {
    errors.push({
      field: "description",
      message: tooLong(descriptionCopy.label, quoteFields.description.max),
    });
  } else if (hasDisallowedControls(description, true)) {
    errors.push({ field: "description", message: descriptionCopy.missing });
  }

  const serviceSlug = raw.service.trim();
  const service = quoteServiceList().find((item) => item.slug === serviceSlug);
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
      description,
      serviceSlug: service.slug,
      serviceName: service.name,
    },
  };
}
