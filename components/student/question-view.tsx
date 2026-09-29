"use client";

import { Check, CircleCheck, CircleX, Info, Lock, WifiOff, X } from "lucide-react";
import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react";
import { ANSWER_LETTERS, answerStyles } from "@/components/ui/answer-colors";
import { Button } from "@/components/ui/button";
import type { ApiError } from "@/lib/api";
import type { Feedback, StudentQuestion } from "@/lib/types";
import { useAnswer, type SaveStatus } from "@/lib/use-answer";

/** PRD QQ2: the teacher asked out loud. */
export const DEFAULT_PROMPT = "Answer the question your teacher asked.";
const TEXT_MAX = 500;
const FINAL_HINT = "You'll see if you got it right. After that, your answer can't change.";

function rejectionMessage(error: ApiError): string {
  switch (error.code) {
    case "activity_ended":
      return "This activity has ended, so that answer wasn't saved.";
    case "response_locked":
      return "Your answer is locked and can't be changed.";
    case "not_current_question":
      return "Your teacher has moved on to another question.";
    case "already_finished":
      return "You've finished this quiz, so that answer wasn't saved.";
    default:
      return error.message;
  }
}

/** What a question reports to a navigator: answered, still saving, and how it went. */
export type QuestionProgress = {
  answered: boolean;
  /** Saving or retrying: finishing now could lose the answer. */
  busy: boolean;
  /** From the feedback: true/false, null when there's no correct answer, undefined unknown. */
  correct: boolean | null | undefined;
};

/**
 * One question to answer: MC letters, True/False, or a short text answer (PRD QQ3, A1).
 * A locked answer is shown read-only. With feedback on (PRD A2), the student picks, then
 * checks: the answer locks and they see ✓/✗, the right answer and the explanation.
 */
export function QuestionView({
  code,
  activityId,
  question,
  questionCount,
  numbered = true,
  teacherPaced = false,
  feedbackOn = false,
  onProgress,
  onStale,
}: {
  code: string;
  activityId: number;
  question: StudentQuestion;
  questionCount: number;
  /** Show "Question 3 of 10" above the prompt. Off when a navigator already says it. */
  numbered?: boolean;
  /** A teacher-paced quiz: answers can change until the teacher moves on, then lock. */
  teacherPaced?: boolean;
  /** The activity shows feedback: each answer locks as soon as it's saved. */
  feedbackOn?: boolean;
  onProgress?: (questionId: number, progress: QuestionProgress) => void;
  /** The server's view changed (answer refused, token refused): refetch the state. */
  onStale: () => void;
}) {
  const { answer, status, submit, locked, feedback } = useAnswer({
    code,
    activityId,
    question,
    onRejected: onStale,
    onTokenRefused: onStale,
  });
  const promptId = useId();
  const busy = status.kind === "saving" || status.kind === "retrying";
  // With feedback on, a tap only picks: the answer is final once checked.
  const [draft, setDraft] = useState<number | null>(null);
  const confirmFirst = feedbackOn && !locked;

  const answered = answer !== null;
  const correct = feedback ? feedback.is_correct : undefined;
  useEffect(() => {
    onProgress?.(question.id, { answered, busy, correct });
  }, [onProgress, question.id, answered, busy, correct]);

  const chosen = answer && "choice_index" in answer ? answer.choice_index : null;

  return (
    <section aria-labelledby={promptId}>
      {numbered && questionCount > 1 && (
        <p className="text-body-lg text-text-muted">
          Question {question.order + 1} of {questionCount}
        </p>
      )}
      <h1
        id={promptId}
        tabIndex={-1}
        className={
          "mt-1 text-h3 font-semibold break-words outline-none " +
          (question.prompt ? "text-text" : "text-text-muted")
        }
      >
        {question.prompt || DEFAULT_PROMPT}
      </h1>

      <div className="mt-6">
        {question.type === "SA" ? (
          <TextAnswer
            saved={question.response?.text_answer ?? null}
            current={answer && "text_answer" in answer ? answer.text_answer : null}
            disabled={locked || (feedbackOn && busy)}
            submitLabel={feedbackOn ? "Check answer" : null}
            labelledBy={promptId}
            onSubmit={(text) => submit({ text_answer: text })}
          />
        ) : (
          <>
            <Choices
              question={question}
              selected={confirmFirst && !busy ? (draft ?? chosen) : chosen}
              feedback={feedback}
              disabled={locked || (feedbackOn && busy)}
              labelledBy={promptId}
              onChoose={(index) =>
                confirmFirst ? setDraft(index) : submit({ choice_index: index })
              }
            />
            {confirmFirst && (
              <Button
                size="lg"
                className="mt-4 h-13 w-full"
                disabled={draft === null || busy}
                onClick={() => {
                  if (draft !== null) submit({ choice_index: draft });
                }}
              >
                {busy ? "Checking…" : "Check answer"}
              </Button>
            )}
            {confirmFirst && !busy && (
              <p className="mt-2 text-body text-text-muted">{FINAL_HINT}</p>
            )}
          </>
        )}
      </div>

      {feedback ? (
        <FeedbackPanel question={question} feedback={feedback} />
      ) : (
        <SaveLine status={status} locked={locked} teacherPaced={teacherPaced} />
      )}
      {teacherPaced && !locked && answer && status.kind !== "rejected" && (
        <p className="mt-1 text-body text-text-muted">
          You can change your answer until your teacher moves on.
        </p>
      )}
      {question.type === "SA" && confirmFirst && !busy && status.kind !== "rejected" && (
        <p className="mt-1 text-body text-text-muted">{FINAL_HINT}</p>
      )}
    </section>
  );
}

type Mark = "correct" | "incorrect" | null;

/** How feedback marks an option: the right one, and the student's pick if it was wrong. */
function markFor(feedback: Feedback | null, index: number, isSelected: boolean): Mark {
  if (!feedback) return null;
  if (feedback.correct_index === index) return "correct";
  if (isSelected && feedback.is_correct === false) return "incorrect";
  return null;
}

const markStyles: Record<"correct" | "incorrect", string> = {
  correct: "border-success bg-success-subtle ring-2 ring-success ring-inset",
  incorrect: "border-danger bg-danger-subtle ring-2 ring-danger ring-inset",
};

function MarkIcon({ mark, className = "" }: { mark: Mark; className?: string }) {
  if (mark === "correct") {
    return <Check className={`size-5 text-success ${className}`} strokeWidth={2.5} aria-hidden />;
  }
  if (mark === "incorrect") {
    return <X className={`size-5 text-danger ${className}`} strokeWidth={2.5} aria-hidden />;
  }
  return null;
}

const markLabel = (mark: Mark) =>
  mark === "correct" ? ", correct answer" : mark === "incorrect" ? ", your answer, incorrect" : "";

function Choices({
  question,
  selected,
  feedback,
  disabled,
  labelledBy,
  onChoose,
}: {
  question: StudentQuestion;
  selected: number | null;
  feedback: Feedback | null;
  disabled: boolean;
  labelledBy: string;
  onChoose: (index: number) => void;
}) {
  const choose = (index: number) => {
    if (!disabled && index !== selected) onChoose(index);
  };

  if (question.type === "TF") {
    return (
      <div role="radiogroup" aria-labelledby={labelledBy} className="space-y-3">
        {question.choices.map((label, index) => {
          const isSelected = index === selected;
          const mark = markFor(feedback, index, isSelected);
          return (
            <button
              key={index}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`${label}${markLabel(mark)}`}
              disabled={disabled}
              onClick={() => choose(index)}
              className={
                "flex min-h-14 w-full items-center justify-between gap-3 rounded-md border px-4 text-left " +
                "text-h3 font-semibold text-text transition-[background-color,border-color,transform] " +
                "duration-150 ease-brand motion-safe:active:translate-y-0.5 " +
                (isSelected || mark ? "" : "disabled:opacity-60 ") +
                (mark
                  ? markStyles[mark]
                  : isSelected
                    ? "border-accent bg-accent-subtle ring-1 ring-accent ring-inset"
                    : "border-border-strong bg-surface hover:bg-surface-2")
              }
            >
              {label}
              {mark ? (
                <MarkIcon mark={mark} />
              ) : (
                isSelected && (
                  <Check className="size-5 text-accent" strokeWidth={2.25} aria-hidden />
                )
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // A quick question's options are just their letters, so they get big tiles. Labelled
  // options (quizzes) get full-width rows with the letter badge.
  const lettersOnly = question.choices.every((label, index) => label === ANSWER_LETTERS[index]);

  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      className={lettersOnly ? "grid grid-cols-2 gap-3" : "space-y-2.5"}
    >
      {question.choices.map((label, index) => {
        const letter = ANSWER_LETTERS[index];
        const style = answerStyles[letter];
        const isSelected = index === selected;
        const mark = markFor(feedback, index, isSelected);
        return (
          <button
            key={index}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={(lettersOnly ? letter : `${letter}: ${label}`) + markLabel(mark)}
            disabled={disabled}
            onClick={() => choose(index)}
            className={
              "relative flex w-full items-center gap-3 rounded-md border border-l-4 border-border text-left " +
              "transition-[background-color,box-shadow,transform] duration-150 ease-brand " +
              "motion-safe:active:translate-y-0.5 " +
              (isSelected || mark ? "" : "disabled:opacity-60 ") +
              `${style.edge} ` +
              (lettersOnly ? "h-24 justify-center " : "min-h-13 px-3 ") +
              (mark
                ? markStyles[mark]
                : isSelected
                  ? `ring-2 ring-inset ${style.selected}`
                  : "bg-surface hover:bg-surface-2")
            }
          >
            <span
              className={
                "flex shrink-0 items-center justify-center rounded-sm font-semibold " +
                (lettersOnly ? "size-12 text-h2 " : "size-7 text-body-lg ") +
                style.badge
              }
            >
              {letter}
            </span>
            {!lettersOnly && <span className="text-body-lg break-words text-text">{label}</span>}
            {mark ? (
              <MarkIcon
                mark={mark}
                className={lettersOnly ? "absolute top-2 right-2" : "ml-auto shrink-0"}
              />
            ) : (
              isSelected && (
                <Check
                  className={
                    "size-5 text-text " +
                    (lettersOnly ? "absolute top-2 right-2" : "ml-auto shrink-0")
                  }
                  strokeWidth={2.25}
                  aria-hidden
                />
              )
            )}
          </button>
        );
      })}
    </div>
  );
}

function TextAnswer({
  saved,
  current,
  disabled,
  submitLabel,
  labelledBy,
  onSubmit,
}: {
  saved: string | null;
  current: string | null;
  disabled: boolean;
  /** Overrides "Submit answer" / "Update answer". */
  submitLabel: string | null;
  labelledBy: string;
  onSubmit: (text: string) => void;
}) {
  const [draft, setDraft] = useState(current ?? "");
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();
  const trimmed = draft.trim();
  const unchanged = trimmed === (current ?? saved ?? "").trim() && trimmed !== "";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trimmed) {
      setError("Type an answer first.");
      return;
    }
    setError(null);
    onSubmit(trimmed);
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <textarea
        aria-labelledby={labelledBy}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        value={disabled && current !== null ? current : draft}
        onChange={(event) => {
          setDraft(event.target.value);
          if (error) setError(null);
        }}
        disabled={disabled}
        maxLength={TEXT_MAX}
        rows={3}
        placeholder="Type your answer"
        enterKeyHint="send"
        className={
          "block w-full resize-y rounded-md border bg-surface px-3 py-2.5 text-body-lg text-text " +
          "transition-colors duration-150 ease-brand placeholder:text-text-subtle " +
          "hover:border-text-subtle disabled:opacity-60 " +
          (error ? "border-danger" : "border-border-strong")
        }
      />
      <div className="mt-1.5 flex min-h-6 items-start justify-between gap-3 text-body-lg">
        {error ? (
          <p id={errorId} className="text-danger">
            {error}
          </p>
        ) : (
          <span />
        )}
        {draft.length > TEXT_MAX - 100 && (
          <span className="font-mono text-text-subtle tabular-nums">
            {draft.length}/{TEXT_MAX}
          </span>
        )}
      </div>
      {!disabled && (
        <Button type="submit" size="lg" className="mt-3 h-13 w-full" disabled={unchanged}>
          {submitLabel ?? (saved !== null || current !== null ? "Update answer" : "Submit answer")}
        </Button>
      )}
    </form>
  );
}

/**
 * After a checked answer (PRD A2): ✓ or ✗ with words, never color alone; the right answer
 * when the student missed it; and the teacher's explanation.
 */
export function FeedbackPanel({
  question,
  feedback,
  live = true,
  className = "mt-5",
}: {
  question: StudentQuestion;
  feedback: Feedback;
  /** Announce it: it just appeared because the student checked their answer. */
  live?: boolean;
  className?: string;
}) {
  const { is_correct: correct, explanation } = feedback;
  const Icon = correct === true ? CircleCheck : correct === false ? CircleX : Info;
  const tone =
    correct === true
      ? "border-success/30 bg-success-subtle"
      : correct === false
        ? "border-danger/30 bg-danger-subtle"
        : "border-border bg-surface-2";
  const iconColor =
    correct === true ? "text-success" : correct === false ? "text-danger" : "text-text-muted";
  const title = correct === true ? "Correct" : correct === false ? "Not quite" : "Answer saved";

  let rightAnswer: ReactNode = null;
  if (correct === false) {
    if (question.type === "SA") {
      const accepted = feedback.accepted_answers;
      if (accepted.length > 0) {
        rightAnswer = (
          <p className="mt-1 text-body-lg text-text">
            {accepted.length === 1 ? "The answer is " : "Accepted answers: "}
            <span className="font-medium">{accepted.join(", ")}</span>
          </p>
        );
      }
    } else if (feedback.correct_index !== null) {
      const label = question.choices[feedback.correct_index] ?? "";
      const letter = ANSWER_LETTERS[feedback.correct_index];
      rightAnswer = (
        <p className="mt-1 text-body-lg text-text">
          The answer is{" "}
          <span className="font-medium">
            {question.type === "TF" || label === letter ? label : `${letter}: ${label}`}
          </span>
        </p>
      );
    }
  }

  return (
    <div
      role={live ? "status" : undefined}
      className={`rounded-md border px-4 py-3.5 motion-safe:animate-fade-in ${tone} ${className}`}
    >
      <p className="flex items-center gap-2 text-body-lg font-semibold text-text">
        <Icon className={`size-5 shrink-0 ${iconColor}`} strokeWidth={2} aria-hidden />
        {title}
      </p>
      {correct === null && (
        <p className="mt-1 text-body-lg text-text-muted">
          This question has no single right answer.
        </p>
      )}
      {rightAnswer}
      {explanation && (
        <p className="mt-2 text-body-lg break-words whitespace-pre-line text-text-muted">
          {explanation}
        </p>
      )}
    </div>
  );
}

/** "Answer saved ✓", or why not yet (PRD S4). Announced politely. */
function SaveLine({
  status,
  locked,
  teacherPaced,
}: {
  status: SaveStatus;
  locked: boolean;
  teacherPaced: boolean;
}) {
  let content: ReactNode = null;
  if (status.kind === "saving") {
    content = <span className="text-text-muted">Saving…</span>;
  } else if (status.kind === "retrying") {
    content = (
      <span className="inline-flex items-center gap-2 text-warning">
        <WifiOff className="size-5 shrink-0" strokeWidth={1.75} aria-hidden />
        Connection is slow. Retrying…
      </span>
    );
  } else if (status.kind === "rejected") {
    content = <span className="text-text-muted">{rejectionMessage(status.error)}</span>;
  } else if (locked) {
    content = (
      <span className="inline-flex items-center gap-2 text-text-muted">
        <Lock className="size-5 shrink-0" strokeWidth={1.75} aria-hidden />
        {teacherPaced
          ? "Your teacher moved past this question, so your answer is locked."
          : "Your answer is locked."}
      </span>
    );
  } else if (status.kind === "saved") {
    content = (
      <span className="inline-flex items-center gap-1.5 text-success motion-safe:animate-fade-in">
        <Check className="size-5 shrink-0" strokeWidth={2.25} aria-hidden />
        Answer saved
      </span>
    );
  }

  return (
    <p aria-live="polite" className="mt-5 flex min-h-7 items-center text-body-lg font-medium">
      {content}
    </p>
  );
}
