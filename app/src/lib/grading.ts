/** The pure rules behind trustworthy grading, kept apart from the model calls so they can be tested. */

/** Reviewers disagreeing by this much (total, or on any one criterion) is flagged for a human. */
export const DISAGREE_TOTAL = 12;
export const DISAGREE_CRITERION = 8;

/** Normalise for quote-matching: case, whitespace and markdown punctuation shouldn't make a real quote look fake. */
export const normQuote = (s: string) => s.toLowerCase().replace(/[`*_#>|]/g, "").replace(/\s+/g, " ").trim();

/**
 * A quote counts only if it appears verbatim (after normalising) in what the reviewer was shown.
 * Paraphrases, spliced "…" quotes and lines from the brief are not in the evidence, so they fail.
 * `haystacks` must already be normalised with normQuote.
 */
export function verifyQuote(quote: string, ...haystacks: string[]) {
  const n = normQuote(quote.trim().replace(/^["'`]+|["'`]+$/g, ""));
  return n.length >= 8 && haystacks.some((h) => h.includes(n));
}

type Scored = { total: number; scores: Record<string, number>; evidence: Record<string, { verified: boolean } | undefined> };

/** Whether a person should look before the score is trusted. */
export function needsHumanReview(reviews: Scored[], keys: readonly string[], failedReviewers: number) {
  if (failedReviewers > 0) return true; // a configured reviewer failed, so the score wasn't cross-checked
  if (reviews.length >= 2) {
    const [a, b] = reviews;
    const maxCrit = Math.max(...keys.map((k) => Math.abs((a.scores[k] ?? 0) - (b.scores[k] ?? 0))));
    if (Math.abs(a.total - b.total) >= DISAGREE_TOTAL || maxCrit >= DISAGREE_CRITERION) return true;
  }
  // Scores that cite nothing real are not scores. If most quotes are invented or missing, a person should look.
  return reviews.some((r) => keys.filter((k) => !r.evidence[k]?.verified).length >= 4);
}
