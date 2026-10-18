import {
  cityCharacterMessage,
  customerTextError,
  formatUkPostcode,
  numberCharacterMessage,
  postcodeInvalidMessage,
  streetCharacterMessage,
} from "./customer-text";

export const addressPartKeys = ["number", "street", "city", "postcode"] as const;

export type AddressPartKey = (typeof addressPartKeys)[number];

export { ukPostcodePattern } from "./customer-text";

export const addressFields = {
  number: {
    label: "Number",
    autocomplete: "on",
    max: 30,
    missing: "Enter the house number.",
    invalid: numberCharacterMessage,
  },
  street: {
    label: "Street",
    autocomplete: "street-address",
    max: 100,
    missing: "Enter the street.",
    invalid: streetCharacterMessage,
  },
  city: {
    label: "City",
    autocomplete: "address-level2",
    max: 80,
    missing: "Enter the city.",
    invalid: cityCharacterMessage,
  },
  postcode: {
    label: "Postcode",
    autocomplete: "postal-code",
    max: 12,
    missing: "Enter the postcode.",
    invalid: postcodeInvalidMessage,
  },
} as const;

export interface AddressPartsInput {
  number: string;
  street: string;
  city: string;
  postcode: string;
}

export interface AddressFieldError {
  ok: false;
  field: AddressPartKey;
  message: string;
}

function tooLong(label: string, max: number): string {
  return `${label} must be ${max} characters or fewer.`;
}

function readTextPart(
  field: Exclude<AddressPartKey, "postcode">,
  value: string,
): { ok: true; value: string } | AddressFieldError {
  const trimmed = value.trim();
  if (!trimmed) {
    return { ok: false, field, message: addressFields[field].missing };
  }
  const normalized = trimmed.replace(/ {2,}/g, " ");
  if (normalized.length > addressFields[field].max) {
    return {
      ok: false,
      field,
      message: tooLong(addressFields[field].label, addressFields[field].max),
    };
  }
  const character = customerTextError(field, normalized);
  if (character) return { ok: false, field, message: character };
  return { ok: true, value: normalized };
}

/**
 * One readable line, always number, street, city, then postcode.
 * Example: "12 Example Street, Coventry, CV3 1QD".
 */
export function propertyAddressLine(parts: {
  number: string;
  street: string;
  city: string;
  postcode: string;
}): string {
  return `${parts.number} ${parts.street}, ${parts.city}, ${parts.postcode}`;
}

export interface AddressIssue {
  field: AddressPartKey;
  message: string;
}

function readPostcode(value: string): { ok: true; value: string } | AddressFieldError {
  const postcodeTrimmed = value.trim();
  if (!postcodeTrimmed) {
    return { ok: false, field: "postcode", message: addressFields.postcode.missing };
  }
  if (postcodeTrimmed.length > addressFields.postcode.max) {
    return {
      ok: false,
      field: "postcode",
      message: tooLong(addressFields.postcode.label, addressFields.postcode.max),
    };
  }
  const character = customerTextError("postcode", postcodeTrimmed);
  if (character) {
    return { ok: false, field: "postcode", message: character };
  }
  const postcode = formatUkPostcode(postcodeTrimmed);
  if (!postcode) {
    return { ok: false, field: "postcode", message: addressFields.postcode.invalid };
  }
  return { ok: true, value: postcode };
}

export function validateAddressParts(
  raw: AddressPartsInput,
): { ok: true; line: string } | { ok: false; field: AddressPartKey; message: string; errors: AddressIssue[] } {
  const number = readTextPart("number", raw.number);
  const street = readTextPart("street", raw.street);
  const city = readTextPart("city", raw.city);
  const postcode = readPostcode(raw.postcode);
  const errors: AddressIssue[] = [];
  if (!number.ok) errors.push({ field: number.field, message: number.message });
  if (!street.ok) errors.push({ field: street.field, message: street.message });
  if (!city.ok) errors.push({ field: city.field, message: city.message });
  if (!postcode.ok) errors.push({ field: postcode.field, message: postcode.message });
  if (!number.ok || !street.ok || !city.ok || !postcode.ok) {
    const first = errors[0] ?? { field: "number" as const, message: addressFields.number.missing };
    return {
      ok: false,
      field: first.field,
      message: first.message,
      errors: errors.length > 0 ? errors : [first],
    };
  }

  return {
    ok: true,
    line: propertyAddressLine({
      number: number.value,
      street: street.value,
      city: city.value,
      postcode: postcode.value,
    }),
  };
}
