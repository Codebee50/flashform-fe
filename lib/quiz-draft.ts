// The quiz editor's local state (PRD §5.3, docs/api/quizzes.md). Questions and their list
// items have no ids in the API, so the draft keys them locally. Each question keeps the
// fields of every type, so switching MC → SA → MC doesn't lose the choices; what doesn't
// fit the current type is stripped when the draft is turned into a request.
import { ApiError } from "./api";
import type { QuestionType, Quiz, QuizQuestionWriteRequest, QuizWriteRequest } from "./types";

export const TITLE_MAX = 200;
export const PROMPT_MAX = 1000;
export const EXPLANATION_MAX = 2000;
export const CHOICE_MAX = 300;
export const ACCEPTED_MAX = 500;
export const MIN_CHOICES = 2;
export const MAX_CHOICES = 6;
export const MAX_ACCEPTED = 20;
export const MAX_QUESTIONS = 100;
/** New MC questions start with A–D, like quick questions (PRD §17). */
const DEFAULT_CHOICES = 4;

export type DraftItem = { key: string; text: string };

export type DraftQuestion = {
  key: string;
  type: QuestionType;
  prompt: string;
  explanation: string;
  choices: DraftItem[];
  /** MC: index into `choices`, or null for no correct answer. */
  mcCorrect: number | null;
  /** TF: 0 = True, 1 = False, or null. */
  tfCorrect: number | null;
  acceptedAnswers: DraftItem[];
};

export type Draft = { title: string; questions: DraftQuestion[] };

let lastKey = 0;
const newKey = () => `k${++lastKey}`;

export const draftItem = (text = ""): DraftItem => ({ key: newKey(), text });

export function blankQuestion(type: QuestionType = "MC"): DraftQuestion {
  return {
    key: newKey(),
    type,
    prompt: "",
    explanation: "",
    choices: Array.from({ length: DEFAULT_CHOICES }, () => draftItem()),
    mcCorrect: null,
    tfCorrect: null,
    acceptedAnswers: [],
  };
}

export const blankDraft = (): Draft => ({ title: "", questions: [blankQuestion()] });

export function draftFromQuiz(quiz: Quiz): Draft {
  return {
    title: quiz.title,
    questions: quiz.questions.map((q) => ({
      key: newKey(),
      type: q.type,
      prompt: q.prompt,
      explanation: q.explanation,
      choices:
        q.type === "MC"
          ? q.choices.map((text) => draftItem(text))
          : Array.from({ length: DEFAULT_CHOICES }, () => draftItem()),
      mcCorrect: q.type === "MC" ? q.correct_index : null,
      tfCorrect: q.type === "TF" ? q.correct_index : null,
      acceptedAnswers: q.accepted_answers.map((text) => draftItem(text)),
    })),
  };
}

function questionRequest(q: DraftQuestion): QuizQuestionWriteRequest {
  const base = { type: q.type, prompt: q.prompt.trim(), explanation: q.explanation.trim() };
  switch (q.type) {
    case "MC":
      return { ...base, choices: q.choices.map((c) => c.text.trim()), correct_index: q.mcCorrect };
    case "TF":
      return { ...base, correct_index: q.tfCorrect };
    case "SA":
      return { ...base, accepted_answers: q.acceptedAnswers.map((a) => a.text.trim()) };
  }
}

/**
 * The PUT/POST body. Blank choices and answers are sent as they are, so the server's
 * per-item errors line up with the inputs on screen.
 */
export function toRequest(draft: Draft): QuizWriteRequest {
  return { title: draft.title.trim(), questions: draft.questions.map(questionRequest) };
}

/** Compares drafts by what would be saved, so undoing an edit makes the quiz clean again. */
export const fingerprint = (draft: Draft) => JSON.stringify(toRequest(draft));

/**
 * Error slots inside one question: `prompt`, `explanation`, `type`, `choices` (the list as
 * a whole), `correct`, `accepted` (the list), `question` (anything else), and
 * `choice:<item key>` / `accepted:<item key>` for single inputs.
 */
export type QuestionErrors = Record<string, string>;

export type DraftErrors = {
  title?: string;
  /** About the list of questions: none, or more than 100. */
  questions?: string;
  byQuestion: Record<string, QuestionErrors>;
  /** Not about any one input: network, server, or an error key we don't know. */
  form?: string;
};

export const noErrors = (): DraftErrors => ({ byQuestion: {} });

export const errorCount = (errors: DraftErrors) =>
  Number(Boolean(errors.title)) +
  Number(Boolean(errors.questions)) +
  Object.values(errors.byQuestion).reduce((n, q) => n + Object.keys(q).length, 0);

const QUESTION_FIELDS: Record<string, string> = {
  prompt: "prompt",
  explanation: "explanation",
  type: "type",
  choices: "choices",
  correct_index: "correct",
  accepted_answers: "accepted",
};

/**
 * Puts each validation message next to its input. The server reports dotted paths with
 * indexes (`questions.1.choices.2`); they're resolved against the draft that was sent, so
 * they still land on the right input if the teacher reordered questions meanwhile.
 */
export function draftErrors(error: ApiError, sent: Draft): DraftErrors {
  const result = noErrors();
  const leftover: string[] = [];

  for (const [path, messages] of Object.entries(error.fields)) {
    const message = messages[0];
    if (!message) continue;
    const [root, index, field, item] = path.split(".");

    if (path === "title") result.title = message;
    else if (path === "questions") result.questions = message;
    else if (root === "questions" && sent.questions[Number(index)]) {
      const question = sent.questions[Number(index)];
      const slots = (result.byQuestion[question.key] ??= {});
      const slot = field === undefined ? "question" : QUESTION_FIELDS[field];
      const list = field === "choices" ? question.choices : question.acceptedAnswers;
      const listItem = item !== undefined ? list[Number(item)] : undefined;

      if (!slot) slots.question ??= message;
      else if (listItem) slots[`${field === "choices" ? "choice" : "accepted"}:${listItem.key}`] = message;
      else slots[slot] ??= message;
    } else leftover.push(message);
  }

  if (leftover.length) result.form = leftover[0];
  else if (errorCount(result) === 0) result.form = error.message;
  return result;
}
