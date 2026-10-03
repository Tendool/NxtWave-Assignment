export const RUBRIC = [
  { key: "live", label: "Works live", hint: "The link opens and the app loads" },
  { key: "idea", label: "Idea & usefulness", hint: "Solves a real problem for a real person" },
  { key: "ai_use", label: "Use of AI", hint: "AI is central to the product, not decoration" },
  { key: "code", label: "Code & repo", hint: "Readable repo, sensible structure, real commits" },
  { key: "presentation", label: "Presentation", hint: "README and page explain what it is and how to use it" },
] as const;
export type RubricKey = (typeof RUBRIC)[number]["key"];
