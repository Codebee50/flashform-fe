import { Check, EyeOff, MessageSquareText } from "lucide-react";
import { ANSWER_LETTERS, answerStyles } from "@/components/ui/answer-colors";
import type { QuestionSummary, TeacherQuestion, TeacherState } from "@/lib/types";

export const percent = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

/**
 * The question on screen with its summary: the current one (teacher-paced, quick), or the
 * one the teacher picked (student-paced, where there is no current question).
 */
export function shownQuestion(state: TeacherState, selectedIndex: number) {
  const index =
    state.activity.mode === "STUDENT_PACED" ? selectedIndex : state.activity.current_index;
  const question = state.questions[index] ?? state.questions[0];
  if (!question) return null;
  return { question, summary: summaryFor(state, question) };
}

/** A question's summary; all zeros if the state has none for it yet. */
export function summaryFor(state: TeacherState, question: TeacherQuestion): QuestionSummary {
  return (
    state.summaries.find((s) => s.question_id === question.id) ?? {
      question_id: question.id,
      answered_count: 0,
      correct_count: null,
      choice_counts: question.choices.map(() => 0),
      text_counts: [],
    }
  );
}

/**
 * Live results for one question (PRD L2): "answered / joined", % correct when the question
 * has a correct answer, then a bar per option (MC/TF) or the grouped answers (SA). With
 * results hidden (PRD L4) only "answered / joined" stays, so a projector gives nothing away.
 */
export function ActivityResults({
  state,
  selectedIndex,
  hideResults = false,
}: {
  state: TeacherState;
  /** Student-paced: which question to chart. */
  selectedIndex: number;
  hideResults?: boolean;
}) {
  const current = shownQuestion(state, selectedIndex);
  if (!current) return null;
  const { question, summary } = current;
  const answered = summary.answered_count;
  const joined = state.participant_count;
  const showCorrect = summary.correct_count !== null && answered > 0 && !hideResults;

  return (
    <div>
      <p
        className={
          "text-body-lg font-medium break-words " +
          (question.prompt ? "text-text" : "text-text-muted")
        }
      >
        {question.prompt || "Asked out loud"}
      </p>

      <dl aria-live="polite" className="mt-5 flex flex-wrap gap-x-10 gap-y-4">
        <div>
          <dt className="text-caption text-text-subtle">Answered</dt>
          <dd className="mt-1 font-mono text-h1 font-semibold text-text tabular-nums">
            {answered}
            <span className="text-text-subtle">/{joined}</span>
          </dd>
        </div>
        {showCorrect && (
          <div>
            <dt className="text-caption text-text-subtle">Correct</dt>
            <dd className="mt-1 font-mono text-h1 font-semibold text-text tabular-nums">
              {percent(summary.correct_count ?? 0, answered)}%
            </dd>
          </div>
        )}
      </dl>

      <div className="mt-6 border-t border-border pt-5">
        {hideResults ? (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="flex size-11 items-center justify-center rounded-full bg-surface-2">
              <EyeOff className="size-5 text-text-subtle" strokeWidth={1.75} aria-hidden />
            </div>
            <p className="mt-4 text-body-lg text-text">Results hidden</p>
            <p className="mt-1 max-w-prose text-body text-text-muted">
              Answers keep coming in. Show results when you&apos;re ready to go over them.
            </p>
          </div>
        ) : question.type === "SA" ? (
          <TextResults summary={summary} />
        ) : (
          <ChoiceResults question={question} summary={summary} />
        )}
      </div>
    </div>
  );
}

/** A bar per option (MC/TF), the correct one marked. */
export function ChoiceResults({
  question,
  summary,
}: {
  question: TeacherQuestion;
  summary: QuestionSummary;
}) {
  const answered = summary.answered_count;
  const isTrueFalse = question.type === "TF";

  return (
    <ul className="space-y-4" aria-label="Answers per option">
      {question.choices.map((label, index) => {
        const letter = ANSWER_LETTERS[index];
        const style = answerStyles[letter];
        const votes = summary.choice_counts[index] ?? 0;
        const share = percent(votes, answered);
        const isCorrect = question.correct_index === index;
        // Quick MC options are just their letters: the badge says it all.
        const text = isTrueFalse || label !== letter ? label : null;
        return (
          <li key={index} className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3">
            {isTrueFalse ? (
              <span aria-hidden className="w-12 text-body-lg font-medium text-text">
                {label}
              </span>
            ) : (
              <span
                aria-hidden
                className={`flex size-8 items-center justify-center rounded-sm text-body-lg font-semibold ${style.badge}`}
              >
                {letter}
              </span>
            )}
            <div aria-hidden className="min-w-0">
              {(text && !isTrueFalse) || isCorrect ? (
                <div className="mb-1.5 flex items-center gap-2">
                  {text && !isTrueFalse && (
                    <span className="truncate text-body text-text">{text}</span>
                  )}
                  {isCorrect && (
                    <span className="inline-flex shrink-0 items-center gap-1 text-caption font-medium text-success">
                      <Check className="size-3.5" strokeWidth={2.25} aria-hidden />
                      Correct
                    </span>
                  )}
                </div>
              ) : null}
              <div className="h-3 overflow-hidden rounded-full bg-surface-2">
                <div
                  className={`h-full rounded-full transition-transform duration-220 ease-brand motion-reduce:transition-none ${style.bar}`}
                  style={{ transform: `translateX(${share - 100}%)` }}
                />
              </div>
            </div>
            <span aria-hidden className="min-w-16 text-right">
              <span className="font-mono text-h3 font-semibold text-text tabular-nums">
                {votes}
              </span>
              <span className="ml-1.5 font-mono text-body text-text-subtle tabular-nums">
                {share}%
              </span>
            </span>
            <span className="sr-only">
              {text ?? `Option ${letter}`}: {votes} {votes === 1 ? "answer" : "answers"}
              {isCorrect ? ", correct answer" : ""}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Short answers grouped, most common first. */
export function TextResults({
  summary,
  emptyMessage = "Answers appear here as students send them.",
}: {
  summary: QuestionSummary;
  emptyMessage?: string;
}) {
  if (summary.text_counts.length === 0) {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <div className="flex size-11 items-center justify-center rounded-full bg-surface-2">
          <MessageSquareText className="size-5 text-text-subtle" strokeWidth={1.75} aria-hidden />
        </div>
        <p className="mt-4 text-body text-text-muted">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <ul className="max-h-112 divide-y divide-border overflow-y-auto" aria-label="Submitted answers">
      {summary.text_counts.map(({ answer, count }) => (
        <li key={answer} className="flex items-baseline justify-between gap-4 py-2.5">
          <span className="min-w-0 text-body-lg break-words text-text">{answer}</span>
          <span className="shrink-0 font-mono text-body-lg font-medium text-text-muted tabular-nums">
            {count > 1 ? `×${count}` : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}
