export const RUBRIC = [
  { key: "live", label: "Works live", hint: "The link opens and the app loads" },
  { key: "idea", label: "Idea & usefulness", hint: "Solves a real problem for a real person" },
  { key: "ai_use", label: "Use of AI", hint: "AI is central to the product, not decoration" },
  { key: "code", label: "Code & repo", hint: "Readable repo, sensible structure, real commits" },
  { key: "presentation", label: "Presentation", hint: "README and page explain what it is and how to use it" },
] as const;
export type RubricKey = (typeof RUBRIC)[number]["key"];

/** Rubric for the timed challenge. Same five slots, but "idea" becomes "meets the brief" — it is judged against the assigned question. */
export const CHALLENGE_RUBRIC = [
  { key: "works", label: "Works", hint: "The hosted link loads, or the code clearly runs from its instructions" },
  { key: "brief", label: "Meets the brief", hint: "Does what the assigned challenge actually asked" },
  { key: "ai_use", label: "Use of AI", hint: "AI is central and applied sensibly" },
  { key: "code", label: "Code quality", hint: "Readable, sensible structure, a real README" },
  { key: "presentation", label: "Presentation", hint: "Explains what it is and how to use it" },
] as const;
export type ChallengeKey = (typeof CHALLENGE_RUBRIC)[number]["key"];
