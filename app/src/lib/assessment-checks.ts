/**
 * Generated challenges are handed to students as-is, with nothing attached. A brief that says
 * "use the dataset provided" or "included in the repository" points at material that doesn't exist,
 * so the student is stuck from minute one. This catches that wording so the question can be regenerated.
 */
// Deliberately narrow: plain "data" or "file" would flag ordinary briefs ("given a user's data", "a README file is included").
const THING = String.raw`(?:datasets?|data ?sets?|csv|spreadsheet|repo|repository|starter(?: code| kit| project)?|boilerplate|notebook)`;
const GIVEN = String.raw`(?:provided|attached|included|supplied)`;

const PATTERNS = [
  new RegExp(String.raw`\b${GIVEN}\b[^.\n]{0,25}\b${THING}\b`, "i"), // "the provided dataset", "attached CSV"
  new RegExp(String.raw`\b${THING}\b[^.\n]{0,25}\b${GIVEN}\b`, "i"), // "the dataset provided", "dataset (included in …)"
  /\b(?:in|from) (?:the|our|this) (?:github )?(?:repo|repository)\b/i, // "included in the GitHub repository"
];

/** The first phrase that refers to material the student was never given, or null when the brief is self-contained. */
export function findMissingMaterial(text: string): string | null {
  for (const re of PATTERNS) {
    const m = re.exec(text);
    if (m) return m[0];
  }
  return null;
}
