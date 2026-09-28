import type { AnswerLetter } from "@/components/ui/answer-colors";

/** One example question used by both product previews on the landing page. */
export const DEMO_ROOM = { name: "Period 3 Biology", code: "MAT7B2", joined: 40 };

export const DEMO_QUESTION = {
  number: 3,
  total: 8,
  prompt: "Which organelle produces most of a cell’s ATP?",
  correct: "B" as AnswerLetter,
  choices: [
    { letter: "A", text: "Nucleus", votes: 3 },
    { letter: "B", text: "Mitochondria", votes: 29 },
    { letter: "C", text: "Ribosome", votes: 4 },
    { letter: "D", text: "Golgi apparatus", votes: 2 },
  ] satisfies { letter: AnswerLetter; text: string; votes: number }[],
};

/** "MAT7B2" → "MAT 7B2": codes are shown as two groups of three. */
export function groupCode(code: string) {
  return code.length === 6 ? `${code.slice(0, 3)} ${code.slice(3)}` : code;
}
