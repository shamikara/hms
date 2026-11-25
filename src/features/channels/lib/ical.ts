/**
 * Just enough iCalendar (RFC 5545) for hotel availability: reading the
 * "closed / booked" events Booking.com and Agoda publish, and writing ours.
 *
 * Only whole nights matter. A stay is [first night, departure morning):
 * DTSTART is the first night, DTEND the day they leave (exclusive), both as
 * UTC-midnight Dates, which is how stays are stored everywhere else.
 */

export interface IcalEvent {
  uid: string;
  start: Date;
  end: Date;
  summary: string | null;
}

const DAY = 86_400_000;

/** Lines in .ics may be folded: a line starting with a space continues the last. */
function unfold(text: string): string[] {
  return text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "").split("\n");
}

/** 20261224 / 20261224T140000Z / 20261224T140000 → the calendar day, UTC midnight. */
function parseDay(value: string): Date | null {
  const m = /^(\d{4})(\d{2})(\d{2})/.exec(value.trim());
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return Number.isNaN(d.getTime()) ? null : d;
}

function unescapeText(v: string): string {
  return v.replace(/\\n/gi, " ").replace(/\\([,;\\])/g, "$1").trim();
}

export function parseIcal(text: string): IcalEvent[] {
  if (!/BEGIN:VCALENDAR/i.test(text)) throw new Error("That link did not return a calendar (.ics).");
  const events: IcalEvent[] = [];
  let cur: Partial<IcalEvent> & { cancelled?: boolean } | null = null;

  for (const raw of unfold(text)) {
    const line = raw.trim();
    if (/^BEGIN:VEVENT$/i.test(line)) {
      cur = {};
      continue;
    }
    if (/^END:VEVENT$/i.test(line)) {
      if (cur?.start && !cur.cancelled) {
        let end = cur.end ?? new Date(cur.start.getTime() + DAY);
        // A single-day event with no length still blocks that night.
        if (end <= cur.start) end = new Date(cur.start.getTime() + DAY);
        events.push({
          uid: cur.uid || `${cur.start.toISOString()}-${end.toISOString()}`,
          start: cur.start,
          end,
          summary: cur.summary ?? null,
        });
      }
      cur = null;
      continue;
    }
    if (!cur) continue;
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const name = line.slice(0, colon).split(";")[0].toUpperCase();
    const value = line.slice(colon + 1);
    if (name === "DTSTART") cur.start = parseDay(value) ?? undefined;
    else if (name === "DTEND") cur.end = parseDay(value) ?? undefined;
    else if (name === "UID") cur.uid = value.trim().slice(0, 300);
    else if (name === "SUMMARY") cur.summary = unescapeText(value).slice(0, 200);
    else if (name === "STATUS" && value.trim().toUpperCase() === "CANCELLED") cur.cancelled = true;
  }
  return events;
}

function fmtDay(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

function fmtStamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeText(v: string): string {
  return v.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/**
 * Our calendar for one room. Deliberately says only "Not available": the
 * outside sites need the dates, not who is staying.
 */
export function buildIcal(opts: { calendarName: string; events: { uid: string; start: Date; end: Date }[] }): string {
  const now = fmtStamp(new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Lily Safari Resort//Channel Sync//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(opts.calendarName)}`,
  ];
  for (const ev of opts.events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${escapeText(ev.uid)}`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${fmtDay(ev.start)}`,
      `DTEND;VALUE=DATE:${fmtDay(ev.end)}`,
      "SUMMARY:Not available",
      "TRANSP:OPAQUE",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}
