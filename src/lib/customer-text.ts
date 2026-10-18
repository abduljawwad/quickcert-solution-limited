/**
 * Character rules for the booking and quote forms.
 * The browser and the API both call customerTextError.
 */

export const quoteEmailPattern = "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$";

/**
 * Optional leading +, then digits, spaces, parentheses, and a dot or hyphen.
 * Dots and hyphens stay allowed because phone numbers are often written with them.
 */
export const quotePhonePattern = "^\\+?[0-9 ().-]+$";

export const quotePhoneDigits = { min: 10, max: 15 } as const;

/**
 * UK postcode, tested after the value is uppercased.
 * A normal space between the outward and inward codes is optional.
 */
export const ukPostcodePattern =
  "^(?:[A-Z][A-HJ-Y]?\\d[A-Z\\d]?\\s*\\d[A-Z]{2}|GIR\\s*0A{2})$";

export const nameCharacterMessage = "Enter your name using letters only.";
export const numberCharacterMessage = "Enter the house number using letters and numbers.";
export const streetCharacterMessage =
  "Enter the street using letters, numbers, and normal punctuation.";
export const cityCharacterMessage = "Enter the city using letters only.";
export const emailInvalidMessage = "Enter a valid email address.";
export const phoneInvalidMessage = "Enter a valid phone number.";
export const postcodeInvalidMessage = "Enter a valid UK postcode.";
export const accessNoteCharacterMessage =
  "Remove unusual characters from who has the keys, or how we should get in.";

const emailPattern = new RegExp(quoteEmailPattern);
const phonePattern = new RegExp(quotePhonePattern);
const ukPostcode = new RegExp(ukPostcodePattern);

const letters = "\\p{L}\\p{M}";
const apostrophes = "'\\u2018\\u2019\\u02BC\\u02BB";
const hyphens = "\\u2010\\u2011\\u2013\\-";
const spaces = " \\u00A0";

const nameChars = new RegExp(`^[${letters}${spaces}${apostrophes}${hyphens}]+$`, "u");
const numberChars = new RegExp(`^[${letters}\\p{Nd}${spaces}${hyphens}]+$`, "u");
const streetChars = new RegExp(
  `^[${letters}\\p{Nd}${spaces}${apostrophes}${hyphens},./]+$`,
  "u",
);

/** C0 controls except tab, newline, and carriage return, plus HTML angle brackets. */
const unusualProse = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F<>]/;
const singleLineControls = /[\u0000-\u001F\u007F]/;

function countLetters(value: string): number {
  return value.match(/\p{L}/gu)?.length ?? 0;
}

function hasLetterOrDigit(value: string): boolean {
  return /[\p{L}\p{Nd}]/u.test(value);
}

export function formatUkPostcode(value: string): string | undefined {
  const upper = value.trim().toUpperCase();
  if (!ukPostcode.test(upper)) return undefined;
  const compact = upper.replace(/\s+/g, "");
  if (compact.length < 5) return undefined;
  return `${compact.slice(0, -3)} ${compact.slice(-3)}`;
}

export function descriptionCharacterMessage(label: string): string {
  const normalized = label.replace(/\s+/g, " ").trim().toLowerCase();
  if (normalized.includes("electrical")) {
    return "Remove unusual characters from the description of the electrical work.";
  }
  if (normalized.includes("plumbing")) {
    return "Remove unusual characters from the description of the plumbing work.";
  }
  return "Remove unusual characters from the description of the work.";
}

function nameTextError(value: string): string {
  const collapsed = value.trim().replace(/\s+/g, " ");
  if (!collapsed) return "";
  if (collapsed.length < 2 || countLetters(collapsed) < 1 || !nameChars.test(collapsed)) {
    return nameCharacterMessage;
  }
  return "";
}

function emailTextError(trimmed: string): string {
  if (!trimmed) return "";
  if (singleLineControls.test(trimmed) || /[<>]/.test(trimmed) || !emailPattern.test(trimmed)) {
    return emailInvalidMessage;
  }
  return "";
}

function phoneTextError(trimmed: string): string {
  if (!trimmed) return "";
  const digits = trimmed.replace(/\D/g, "").length;
  if (
    singleLineControls.test(trimmed) ||
    !phonePattern.test(trimmed) ||
    digits < quotePhoneDigits.min ||
    digits > quotePhoneDigits.max
  ) {
    return phoneInvalidMessage;
  }
  return "";
}

function numberTextError(trimmed: string): string {
  if (!trimmed) return "";
  if (!numberChars.test(trimmed) || !hasLetterOrDigit(trimmed)) return numberCharacterMessage;
  return "";
}

function streetTextError(trimmed: string): string {
  if (!trimmed) return "";
  if (!streetChars.test(trimmed) || !hasLetterOrDigit(trimmed)) return streetCharacterMessage;
  return "";
}

function cityTextError(trimmed: string): string {
  if (!trimmed) return "";
  if (countLetters(trimmed) < 1 || !nameChars.test(trimmed)) return cityCharacterMessage;
  return "";
}

function postcodeTextError(trimmed: string): string {
  if (!trimmed) return "";
  if (!formatUkPostcode(trimmed)) return postcodeInvalidMessage;
  return "";
}

function accessNoteTextError(trimmed: string): string {
  if (!trimmed) return "";
  if (unusualProse.test(trimmed)) return accessNoteCharacterMessage;
  return "";
}

function descriptionTextError(trimmed: string, label: string): string {
  if (!trimmed) return "";
  if (unusualProse.test(trimmed)) return descriptionCharacterMessage(label);
  return "";
}

export interface CustomerTextOptions {
  descriptionLabel?: string;
}

/** Empty when the trimmed value passes. Empty input returns "" so required-field messages stay separate. */
export function customerTextError(
  field: string,
  value: string,
  options?: CustomerTextOptions,
): string {
  const trimmed = value.trim();
  switch (field) {
    case "name":
      return nameTextError(trimmed);
    case "email":
      return emailTextError(trimmed);
    case "phone":
      return phoneTextError(trimmed);
    case "number":
      return numberTextError(trimmed);
    case "street":
      return streetTextError(trimmed);
    case "city":
      return cityTextError(trimmed);
    case "postcode":
      return postcodeTextError(trimmed);
    case "access_note":
      return accessNoteTextError(trimmed);
    case "description":
      return descriptionTextError(trimmed, options?.descriptionLabel ?? "");
    default:
      return "";
  }
}
