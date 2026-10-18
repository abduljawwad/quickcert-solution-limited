import { business, type Service } from "../config/business";
import { addressPartKeys, validateAddressParts, type AddressPartKey } from "./address";
import {
  customerTextError,
  emailInvalidMessage,
  nameCharacterMessage,
  phoneInvalidMessage,
} from "./customer-text";
import { accessNoteError } from "./fields";

export {
  quoteEmailPattern,
  quotePhoneDigits,
  quotePhonePattern,
} from "./customer-text";

export type QuoteService = Extract<Service, { kind: "quote" }>;

export const quoteSuccessMessage =
  "We reply within one working day with a written price before any payment.";

export function quoteNotSavedMessage(): string {
  return `Your enquiry was not saved. Call ${business.phoneDisplay}.`;
}

export const quoteFields = {
  name: {
    label: "Name",
    autocomplete: "name",
    max: 100,
    missing: "Enter your name.",
    invalid: nameCharacterMessage,
  },
  email: {
    label: "Email",
    autocomplete: "email",
    max: 254,
    missing: "Enter your email.",
    invalid: emailInvalidMessage,
  },
  phone: {
    label: "Phone",
    autocomplete: "tel",
    max: 30,
    missing: "Enter your phone number.",
    invalid: phoneInvalidMessage,
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
  "access_note",
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
  access_note: string;
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
  accessNote: string;
  description: string;
  serviceSlug: string;
  serviceName: string;
}

export type QuoteField =
  | "name"
  | "email"
  | "phone"
  | AddressPartKey
  | "access_note"
  | "description"
  | "service";

export interface QuoteFieldError {
  ok: false;
  field: QuoteField;
  message: string;
  errors: { field: QuoteField; message: string }[];
}

function tooLong(label: string, max: number): string {
  return `${label} must be ${max} characters or fewer.`;
}

function quoteServiceList(): QuoteService[] {
  return business.services.filter((service): service is QuoteService => service.kind === "quote");
}

export function isQuoteSlug(slug: string): boolean {
  return quoteServiceList().some((service) => service.slug === slug);
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
    access_note: read("access_note"),
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

  const description = raw.description.trim();
  const descriptionCopy = quoteDescriptionCopy(raw.service.trim());
  if (!description) errors.push({ field: "description", message: descriptionCopy.missing });
  else if (description.length > quoteFields.description.max) {
    errors.push({
      field: "description",
      message: tooLong(descriptionCopy.label, quoteFields.description.max),
    });
  } else {
    const character = customerTextError("description", description, {
      descriptionLabel: descriptionCopy.label,
    });
    if (character) errors.push({ field: "description", message: character });
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
      accessNote,
      description,
      serviceSlug: service.slug,
      serviceName: service.name,
    },
  };
}
