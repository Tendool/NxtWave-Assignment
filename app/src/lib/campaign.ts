/** Campaign settings an admin can change without a redeploy. Validation lives here so it can be tested. */

export type Campaign = {
  /** ISO string with the IST offset, e.g. 2026-10-12T18:00:00+05:30 */
  startsAt: string;
  /** A WhatsApp group or channel invite link, or null when there isn't one yet. */
  whatsappGroupUrl: string | null;
};

const WA = /^https:\/\/(chat\.whatsapp\.com\/[A-Za-z0-9]{10,40}|(www\.)?whatsapp\.com\/channel\/[A-Za-z0-9]{10,40})\/?$/;

export function parseWhatsappUrl(v: string): { ok: true; value: string | null } | { ok: false; error: string } {
  const s = v.trim();
  if (!s) return { ok: true, value: null };
  if (!WA.test(s)) return { ok: false, error: "Use a WhatsApp invite link: https://chat.whatsapp.com/… or https://whatsapp.com/channel/…" };
  return { ok: true, value: s.replace(/\/$/, "") };
}

/** A <input type="datetime-local"> value ("2026-10-12T18:00"), read as IST. */
export function parseIstLocal(v: string): { ok: true; value: string } | { ok: false; error: string } {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(v.trim());
  if (!m) return { ok: false, error: "Pick a date and time." };
  const iso = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:00+05:30`;
  if (Number.isNaN(new Date(iso).getTime())) return { ok: false, error: "That date doesn't exist." };
  return { ok: true, value: iso };
}

/** ISO string → the "2026-10-12T18:00" an IST datetime-local input expects. */
export function toIstLocal(iso: string) {
  const ist = new Date(new Date(iso).getTime() + 330 * 60_000);
  return ist.toISOString().slice(0, 16);
}
