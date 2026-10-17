import { business, type Service } from "../config/business";

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
    invalid: "Enter a valid email.",
  },
  phone: {
    label: "Phone",
    autocomplete: "tel",
    max: 30,
    missing: "Enter your phone number.",
    invalid: "Enter a valid phone number.",
  },
  address: {
    label: "Property address",
    autocomplete: "street-address",
    max: 300,
    missing: "Enter the property address.",
  },
  description: {
    label: "What they need doing",
    max: 2000,
    missing: "Describe what you need doing.",
  },
} as const;

export const quoteRawKeys = [
  "name",
  "email",
  "phone",
  "address",
  "description",
  "service",
  "company_website",
] as const;

export type QuoteRawKey = (typeof quoteRawKeys)[number];

export interface QuoteRaw {
  name: string;
  email: string;
  phone: string;
  address: string;
  description: string;
  service: string;
  company_website: string;
}

export interface ValidQuote {
  name: string;
  email: string;
  phone: string;
  address: string;
  description: string;
  serviceSlug: string;
  serviceName: string;
}

export type QuoteField = "name" | "email" | "phone" | "address" | "description" | "service";

export interface QuoteFieldError {
  ok: false;
  field: QuoteField;
  message: string;
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
    address: read("address"),
    description: read("description"),
    service: read("service"),
    company_website: read("company_website"),
  };
}

export function validateQuote(raw: QuoteRaw): { ok: true; value: ValidQuote } | QuoteFieldError {
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

  const description = raw.description.trim();
  if (!description) {
    return { ok: false, field: "description", message: quoteFields.description.missing };
  }
  if (description.length > quoteFields.description.max) {
    return {
      ok: false,
      field: "description",
      message: tooLong("What you need doing", quoteFields.description.max),
    };
  }
  if (hasDisallowedControls(description, true)) {
    return { ok: false, field: "description", message: quoteFields.description.missing };
  }

  const serviceSlug = raw.service.trim();
  if (!serviceSlug) return { ok: false, field: "service", message: "Service is required." };
  const service = quoteServiceList().find((item) => item.slug === serviceSlug);
  if (!service) return { ok: false, field: "service", message: "Service is not recognised." };

  return {
    ok: true,
    value: {
      name,
      email: email.toLowerCase(),
      phone,
      address,
      description,
      serviceSlug: service.slug,
      serviceName: service.name,
    },
  };
}
