export type FieldControl = HTMLInputElement | HTMLTextAreaElement;

export function controlError(field: FieldControl): string {
  const value = field.value.trim();
  if (!value) return field.dataset.error ?? "";
  if (field instanceof HTMLInputElement && field.dataset.formatPattern) {
    if (!new RegExp(field.dataset.formatPattern).test(value)) {
      return field.dataset.errorFormat ?? "";
    }
  }
  if (field instanceof HTMLInputElement && field.dataset.digitsMin && field.dataset.digitsMax) {
    const digits = value.replace(/\D/g, "").length;
    const min = Number(field.dataset.digitsMin);
    const max = Number(field.dataset.digitsMax);
    if (digits < min || digits > max) return field.dataset.errorFormat ?? "";
  }
  return "";
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
