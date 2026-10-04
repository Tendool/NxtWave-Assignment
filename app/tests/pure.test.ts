import { describe, expect, it } from "vitest";
import { buildIcs, googleCalendarUrl, utcStamp } from "@/lib/calendar";
import { parseIstLocal, parseWhatsappUrl, toIstLocal } from "@/lib/campaign";
import { nextReward } from "@/lib/constants";
import { findMissingMaterial } from "@/lib/assessment-checks";
import { DEFAULT_ASSESSMENT } from "@/lib/assessment-gen";
import { needsHumanReview, normQuote, verifyQuote } from "@/lib/grading";

const start = new Date("2026-10-12T18:00:00+05:30");
const event = { title: "Build Your First AI Project in 60 Minutes", start, minutes: 60, details: "Bring a laptop, a charger; and patience.", url: "https://example.com" };

describe("calendar", () => {
  it("formats UTC stamps without punctuation or milliseconds", () => {
    expect(utcStamp(start)).toBe("20261012T123000Z");
  });

  it("builds a Google Calendar link for the right hour", () => {
    const url = new URL(googleCalendarUrl(event));
    expect(url.searchParams.get("dates")).toBe("20261012T123000Z/20261012T133000Z");
    expect(url.searchParams.get("text")).toBe(event.title);
  });

  it("produces a valid .ics: CRLF lines, escaped text, folded at 75 octets, 30-minute alarm", () => {
    const ics = buildIcs(event, new Date("2026-10-01T00:00:00Z"));
    expect(ics.endsWith("\r\n")).toBe(true);
    expect(ics.split("\r\n").every((l) => Buffer.byteLength(l, "utf8") <= 75)).toBe(true);
    const unfolded = ics.replace(/\r\n /g, "");
    expect(unfolded).toContain("DTSTART:20261012T123000Z");
    expect(unfolded).toContain("DTEND:20261012T133000Z");
    expect(unfolded).toContain("Bring a laptop\\, a charger\\; and patience.\\n\\nhttps://example.com");
    expect(unfolded).toContain("TRIGGER:-PT30M");
  });
});

describe("campaign settings", () => {
  it("accepts WhatsApp group and channel invites only", () => {
    expect(parseWhatsappUrl("https://chat.whatsapp.com/AbCdEf1234567890")).toEqual({ ok: true, value: "https://chat.whatsapp.com/AbCdEf1234567890" });
    expect(parseWhatsappUrl("https://whatsapp.com/channel/0029VaAbCdEf12345/")).toEqual({ ok: true, value: "https://whatsapp.com/channel/0029VaAbCdEf12345" });
    expect(parseWhatsappUrl("")).toEqual({ ok: true, value: null });
    expect(parseWhatsappUrl("https://evil.example/chat.whatsapp.com/abc").ok).toBe(false);
    expect(parseWhatsappUrl("http://chat.whatsapp.com/AbCdEf1234567890").ok).toBe(false);
  });

  it("reads a datetime-local value as IST and round-trips it", () => {
    const r = parseIstLocal("2026-10-12T18:00");
    expect(r).toEqual({ ok: true, value: "2026-10-12T18:00:00+05:30" });
    expect(toIstLocal("2026-10-12T18:00:00+05:30")).toBe("2026-10-12T18:00");
    expect(parseIstLocal("next tuesday").ok).toBe(false);
  });
});

describe("referral rewards", () => {
  it("points at the next tier and how far away it is", () => {
    expect(nextReward(0)).toMatchObject({ needed: 1, tier: { friends: 1 } });
    expect(nextReward(1)).toMatchObject({ needed: 2, tier: { friends: 3 } });
    expect(nextReward(3)).toBeNull();
  });
});

describe("generated challenge briefs", () => {
  it("flags briefs that point at material the student never gets", () => {
    // The real brief that prompted this check.
    expect(findMissingMaterial("Utilize the Athlete Characteristics dataset provided (included in the GitHub repository) to train the model.")).not.toBeNull();
    expect(findMissingMaterial("Load the attached CSV of transactions.")).not.toBeNull();
    expect(findMissingMaterial("Start from the starter code included with this challenge.")).not.toBeNull();
  });

  it("leaves ordinary briefs alone", () => {
    expect(findMissingMaterial(DEFAULT_ASSESSMENT.brief)).toBeNull();
    expect(findMissingMaterial("Given a user's notes, summarise them. Make sure a README file is included.")).toBeNull();
    expect(findMissingMaterial("Type a sample of 15 rows of JSON yourself and validate the data provided by the user.")).toBeNull();
  });
});

describe("trustworthy grading", () => {
  const evidence = normQuote("## Notes AI\nPaste your **lecture notes** and get a summary using Gemini 1.5 Flash.");

  it("verifies only quotes that really appear in the evidence", () => {
    expect(verifyQuote("Paste your lecture notes and get a summary", evidence)).toBe(true);
    expect(verifyQuote('"get a summary using gemini"', evidence)).toBe(true); // surrounding quotes and case don't matter
    expect(verifyQuote("Paste your notes … using Gemini", evidence)).toBe(false); // spliced
    expect(verifyQuote("A well-structured, production-grade app", evidence)).toBe(false); // invented
    expect(verifyQuote("Gemini", evidence)).toBe(false); // too short to prove anything
  });

  const keys = ["works", "brief", "ai_use", "code", "presentation"];
  const allVerified = Object.fromEntries(keys.map((k) => [k, { verified: true }]));
  const review = (scores: number[], evidence = allVerified) => ({
    scores: Object.fromEntries(keys.map((k, i) => [k, scores[i]])),
    total: scores.reduce((a, b) => a + b, 0),
    evidence,
  });

  it("trusts two reviewers who agree and cite real evidence", () => {
    expect(needsHumanReview([review([12, 12, 12, 12, 12]), review([13, 11, 12, 13, 12])], keys, 0)).toBe(false);
  });

  it("flags disagreement on the total or on one criterion", () => {
    expect(needsHumanReview([review([10, 10, 10, 10, 10]), review([13, 13, 13, 13, 10])], keys, 0)).toBe(true); // total gap 12
    expect(needsHumanReview([review([4, 12, 12, 12, 12]), review([12, 12, 12, 12, 12])], keys, 0)).toBe(true); // one criterion gap 8
  });

  it("flags a failed reviewer and mostly-unverifiable evidence", () => {
    expect(needsHumanReview([review([12, 12, 12, 12, 12])], keys, 1)).toBe(true);
    const fake = Object.fromEntries(keys.map((k, i) => [k, { verified: i === 0 }]));
    expect(needsHumanReview([review([12, 12, 12, 12, 12], fake)], keys, 0)).toBe(true);
  });
});
