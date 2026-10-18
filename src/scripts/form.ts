import { customerTextError } from "../lib/customer-text";
import { accessNoteError } from "../lib/fields";

export type FieldControl = HTMLInputElement | HTMLTextAreaElement;

function fieldLabel(field: FieldControl): string {
  return field.labels?.[0]?.textContent?.replace(/\s+/g, " ").trim() ?? "";
}

/** Required-field copy stays on data-error. Character rules come from customerTextError. */
export function controlError(field: FieldControl): string {
  if (field.name === "access_note") return accessNoteError(field.value);
  const value = field.value.trim();
  if (!value) return field.dataset.error ?? "";
  return customerTextError(field.name, value, {
    descriptionLabel: field.name === "description" ? fieldLabel(field) : undefined,
  });
}

export function fieldErrorElement(field: FieldControl): HTMLElement | null {
  const describedBy = field.getAttribute("aria-describedby");
  if (!describedBy) return null;
  const id = describedBy.split(/\s+/).filter(Boolean).at(-1);
  if (!id) return null;
  return document.getElementById(id);
}

export function setFieldError(field: FieldControl, message: string): void {
  const error = fieldErrorElement(field);
  if (error) error.textContent = message;
  if (message) field.setAttribute("aria-invalid", "true");
  else field.removeAttribute("aria-invalid");
}

export function applyFieldErrors(form: HTMLFormElement): FieldControl | null {
  let firstInvalid: FieldControl | null = null;
  for (const node of Array.from(form.querySelectorAll("[data-error]"))) {
    if (!(node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement)) continue;
    const message = controlError(node);
    setFieldError(node, message);
    if (message && !firstInvalid) firstInvalid = node;
  }
  return firstInvalid;
}

export function writeStatus(statusId: string, message: string, ok: boolean): HTMLElement | null {
  const status = document.getElementById(statusId);
  if (!status) return null;
  status.textContent = message;
  status.setAttribute("data-state", message ? (ok ? "success" : "error") : "idle");
  return status;
}

export function messageOf(body: unknown): string | undefined {
  if (!body || typeof body !== "object" || !("message" in body)) return undefined;
  return typeof body.message === "string" ? body.message : undefined;
}

export function fieldOf(body: unknown): string | undefined {
  if (!body || typeof body !== "object" || !("field" in body)) return undefined;
  return typeof body.field === "string" ? body.field : undefined;
}

export function redirectOf(body: unknown): string | undefined {
  if (!body || typeof body !== "object" || !("redirect" in body)) return undefined;
  const redirect = (body as { redirect?: unknown }).redirect;
  if (typeof redirect !== "string" || !redirect) return undefined;
  try {
    const url = new URL(redirect);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}

export function formPayload(form: HTMLFormElement): Record<string, string> {
  const payload: Record<string, string> = {};
  for (const [key, value] of new FormData(form)) {
    if (typeof value === "string") payload[key] = value;
  }
  return payload;
}

export async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export interface ServerFieldError {
  field: string;
  message: string;
}

export function serverFieldErrors(body: unknown): ServerFieldError[] {
  if (body && typeof body === "object" && "errors" in body && Array.isArray(body.errors)) {
    const errors: ServerFieldError[] = [];
    for (const item of body.errors) {
      if (!item || typeof item !== "object") continue;
      const field = "field" in item && typeof item.field === "string" ? item.field : "";
      const message = "message" in item && typeof item.message === "string" ? item.message : "";
      if (field && message) errors.push({ field, message });
    }
    if (errors.length > 0) return errors;
  }
  const field = fieldOf(body);
  const message = messageOf(body);
  if (field && message) return [{ field, message }];
  return [];
}

export function applyServerFieldErrors(form: HTMLFormElement, body: unknown): FieldControl | null {
  let first: FieldControl | null = null;
  for (const error of serverFieldErrors(body)) {
    const named = form.elements.namedItem(error.field);
    const control =
      named instanceof HTMLInputElement || named instanceof HTMLTextAreaElement ? named : null;
    if (!control || control.type === "hidden") continue;
    setFieldError(control, error.message);
    if (!first) first = control;
  }
  return first;
}
