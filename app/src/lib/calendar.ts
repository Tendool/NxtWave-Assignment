/** Calendar links for the workshop. Pure functions, so they're easy to test. */

export type CalEvent = { title: string; start: Date; minutes: number; details: string; url: string };

/** 2026-10-12T12:30:00.000Z → 20261012T123000Z */
export const utcStamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export function googleCalendarUrl(e: CalEvent) {
  const end = new Date(e.start.getTime() + e.minutes * 60_000);
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${utcStamp(e.start)}/${utcStamp(end)}`,
    details: `${e.details}\n\n${e.url}`,
    location: e.url,
  });
  return `https://calendar.google.com/calendar/render?${p}`;
}

/** RFC 5545 text escaping. */
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");

/** RFC 5545 says lines over 75 octets must be folded; calendar apps on phones are strict about it. */
function fold(line: string) {
  const out: string[] = [];
  let rest = line;
  while (Buffer.byteLength(rest, "utf8") > 75) {
    let cut = 75;
    while (Buffer.byteLength(rest.slice(0, cut), "utf8") > 75) cut--;
    out.push(rest.slice(0, cut));
    rest = " " + rest.slice(cut);
  }
  out.push(rest);
  return out.join("\r\n");
}

/** An .ics file with a reminder 30 minutes before, so the student's own phone does the reminding. */
export function buildIcs(e: CalEvent, now = new Date()) {
  const end = new Date(e.start.getTime() + e.minutes * 60_000);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Build60//Workshop//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:build60-${utcStamp(e.start)}@build60`,
    `DTSTAMP:${utcStamp(now)}`,
    `DTSTART:${utcStamp(e.start)}`,
    `DTEND:${utcStamp(end)}`,
    `SUMMARY:${esc(e.title)}`,
    `DESCRIPTION:${esc(`${e.details}\n\n${e.url}`)}`,
    `URL:${e.url}`,
    `LOCATION:${esc(e.url)}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(e.title)} starts in 30 minutes`,
    "TRIGGER:-PT30M",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .map(fold)
    .join("\r\n") + "\r\n";
}
