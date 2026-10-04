export const BRANCHES = [
  "CSE",
  "IT",
  "AI & Data Science / ML",
  "ECE",
  "EEE",
  "Mechanical",
  "Civil",
  "Other",
] as const;

export const YEARS = ["Final year (4th)", "Pre-final year (3rd)", "Recently graduated"] as const;

export const TARGET = 500;

export const WORKSHOP = {
  title: "Build Your First AI Project in 60 Minutes",
  // Default only. The admin can change the date and time at /admin without a redeploy. ISO string, IST.
  startsAt: "2026-10-12T18:00:00+05:30",
  durationMinutes: 60,
  seats: 500,
};

/**
 * What a referrer unlocks. Tiers count friends who actually registered through their link.
 * The vouchers are ₹1,000 of the ₹2,000 budget; the rest costs nothing but the host's time.
 */
export const REWARD_TIERS = [
  { friends: 1, title: "Priority Q&A", detail: "Your question is answered first in the live session." },
  { friends: 3, title: "Featured build", detail: "Your project is pinned to the top of the gallery after the session." },
] as const;

export const TOP_PRIZES = {
  title: "Top 3 referrers",
  detail: "When registration closes, the three people who brought the most friends win Amazon vouchers.",
  amounts: ["₹500", "₹300", "₹200"],
} as const;

/** The next tier someone hasn't reached yet, and how many more friends it takes. */
export function nextReward(friends: number) {
  const next = REWARD_TIERS.find((t) => friends < t.friends);
  return next ? { tier: next, needed: next.friends - friends } : null;
}

/**
 * Who runs the session, shown on the landing page. While `name` is empty the block stays hidden —
 * fill in the real host before launch rather than inventing one.
 */
export const HOST = {
  name: "",
  role: "", // e.g. "Software engineer, NxtWave"
  photo: "", // an https:// image URL, optional
  line: "", // one sentence on why they're the right person to teach this
};
