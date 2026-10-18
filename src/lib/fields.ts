import { customerTextError } from "./customer-text";

export const textLinkClass =
  "text-primary underline decoration-outline underline-offset-4 hover:decoration-primary";

export const labelClass = "block text-sm font-medium text-on-surface";

const controlClass =
  "mt-1 block w-full border border-outline/40 bg-surface-container-lowest px-3 text-base text-on-surface aria-invalid:border-error";

export const inputClass = `${controlClass} min-h-11`;

export const textareaClass = `${controlClass} min-h-32 resize-y py-2`;

export const errorClass = "mt-1 min-h-5 text-sm text-error";

export const accessNoteField = {
  label: "Who has the keys, or how should we get in?",
  hint: "Optional.",
  max: 500,
} as const;

/** Empty when the note is blank or acceptable. Booking and quote forms share this check. */
export function accessNoteError(value: string): string {
  const accessNote = value.trim();
  if (accessNote.length > accessNoteField.max) {
    return `${accessNoteField.label} must be ${accessNoteField.max} characters or fewer.`;
  }
  return customerTextError("access_note", accessNote);
}
