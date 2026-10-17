const LONDON = "Europe/London";
const MAX_TEXT = 200;

const dateTimeFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: LONDON,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const timeFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: LONDON,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const dayFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: LONDON,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const isoInstant =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/;

export interface ConfirmationDetails {
  greeting?: string;
  serviceName?: string;
  visitTime?: string;
}

function label(value: string | null): string | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/[\u0000-\u001F\u007F]/g, "").trim();
  if (!cleaned) return undefined;
  return cleaned.length > MAX_TEXT ? cleaned.slice(0, MAX_TEXT).trim() : cleaned;
}

function parseInstant(value: string | null): Date | undefined {
  if (!value || !isoInstant.test(value)) return undefined;
  const time = Date.parse(value);
  if (Number.isNaN(time)) return undefined;
  return new Date(time);
}

function formatted(format: Intl.DateTimeFormat, date: Date): string | undefined {
  const text = format.format(date);
  if (!text || text === "Invalid Date") return undefined;
  return text;
}

function visitTime(startValue: string | null, endValue: string | null): string | undefined {
  const start = parseInstant(startValue);
  if (!start) return undefined;
  const startText = formatted(dateTimeFormat, start);
  if (!startText) return undefined;

  const end = parseInstant(endValue);
  if (!end) return startText;
  const endFormat = dayFormat.format(start) === dayFormat.format(end) ? timeFormat : dateTimeFormat;
  const endText = formatted(endFormat, end);
  if (!endText) return startText;
  return `${startText} to ${endText}`;
}

export function confirmationFromSearch(search: string): ConfirmationDetails {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const name = label(params.get("invitee_full_name"));
  const serviceName = label(params.get("event_type_name"));
  const when = visitTime(params.get("event_start_time"), params.get("event_end_time"));
  const details: ConfirmationDetails = {};
  if (name) details.greeting = `Hello ${name}.`;
  if (serviceName) details.serviceName = serviceName;
  if (when) details.visitTime = when;
  return details;
}
