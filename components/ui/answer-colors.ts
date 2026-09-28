/**
 * Answer option styles, A–F (BRAND.md §4). Written out in full so Tailwind can
 * see every class. Color always travels with its letter, never alone.
 */
export const ANSWER_LETTERS = ["A", "B", "C", "D", "E", "F"] as const;
export type AnswerLetter = (typeof ANSWER_LETTERS)[number];

export const answerStyles: Record<
  AnswerLetter,
  { badge: string; bar: string; edge: string; selected: string }
> = {
  A: {
    badge: "bg-answer-a text-answer-a-fg",
    bar: "bg-answer-a",
    edge: "border-l-answer-a",
    selected: "bg-answer-a-subtle ring-answer-a",
  },
  B: {
    badge: "bg-answer-b text-answer-b-fg",
    bar: "bg-answer-b",
    edge: "border-l-answer-b",
    selected: "bg-answer-b-subtle ring-answer-b",
  },
  C: {
    badge: "bg-answer-c text-answer-c-fg",
    bar: "bg-answer-c",
    edge: "border-l-answer-c",
    selected: "bg-answer-c-subtle ring-answer-c",
  },
  D: {
    badge: "bg-answer-d text-answer-d-fg",
    bar: "bg-answer-d",
    edge: "border-l-answer-d",
    selected: "bg-answer-d-subtle ring-answer-d",
  },
  E: {
    badge: "bg-answer-e text-answer-e-fg",
    bar: "bg-answer-e",
    edge: "border-l-answer-e",
    selected: "bg-answer-e-subtle ring-answer-e",
  },
  F: {
    badge: "bg-answer-f text-answer-f-fg",
    bar: "bg-answer-f",
    edge: "border-l-answer-f",
    selected: "bg-answer-f-subtle ring-answer-f",
  },
};
