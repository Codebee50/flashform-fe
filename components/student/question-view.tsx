"use client";

import { Check, Lock, WifiOff } from "lucide-react";
import { useId, useState, type FormEvent, type ReactNode } from "react";
import { ANSWER_LETTERS, answerStyles } from "@/components/ui/answer-colors";
import { Button } from "@/components/ui/button";
import type { ApiError } from "@/lib/api";
import type { StudentQuestion } from "@/lib/types";
import { useAnswer, type SaveStatus } from "@/lib/use-answer";

/** PRD QQ2: the teacher asked out loud. */
export const DEFAULT_PROMPT = "Answer the question your teacher asked.";
const TEXT_MAX = 500;

function rejectionMessage(error: ApiError): string {
  switch (error.code) {
    case "activity_ended":
      return "This activity has ended, so that answer wasn't saved.";
    case "response_locked":
      return "Your answer is locked and can't be changed.";
    case "not_current_question":
      return "Your teacher has moved on to another question.";
    default:
      return error.message;
  }
}

/** One question to answer: MC letters, True/False, or a short text answer (PRD QQ3). */
export function QuestionView({
  code,
  activityId,
  question,
  questionCount,
  onStale,
}: {
  code: string;
  activityId: number;
  question: StudentQuestion;
  questionCount: number;
  /** The server's view changed (answer refused, token refused): refetch the state. */
  onStale: () => void;
}) {
  const { answer, status, submit, locked } = useAnswer({
    code,
    activityId,
    question,
    onRejected: onStale,
    onTokenRefused: onStale,
  });
  const promptId = useId();

  return (
    <section aria-labelledby={promptId}>
      {questionCount > 1 && (
        <p className="text-body-lg text-text-muted">
          Question {question.order + 1} of {questionCount}
        </p>
      )}
      <h1
        id={promptId}
        className={
          "mt-1 text-h3 font-semibold break-words " +
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
            disabled={locked}
            labelledBy={promptId}
            onSubmit={(text) => submit({ text_answer: text })}
          />
        ) : (
          <Choices
            question={question}
            selected={answer && "choice_index" in answer ? answer.choice_index : null}
            disabled={locked}
            labelledBy={promptId}
            onChoose={(index) => submit({ choice_index: index })}
          />
        )}
      </div>

      <SaveLine status={status} locked={locked} />
    </section>
  );
}

function Choices({
  question,
  selected,
  disabled,
  labelledBy,
  onChoose,
}: {
  question: StudentQuestion;
  selected: number | null;
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
          return (
            <button
              key={index}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={disabled}
              onClick={() => choose(index)}
              className={
                "flex min-h-14 w-full items-center justify-between gap-3 rounded-md border px-4 text-left " +
                "text-h3 font-semibold text-text transition-[background-color,border-color,transform] " +
                "duration-150 ease-brand motion-safe:active:translate-y-0.5 disabled:opacity-60 " +
                (isSelected
                  ? "border-accent bg-accent-subtle ring-1 ring-accent ring-inset"
                  : "border-border-strong bg-surface hover:bg-surface-2")
              }
            >
              {label}
              {isSelected && (
                <Check className="size-5 text-accent" strokeWidth={2.25} aria-hidden />
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // A quick question's options are just their letters, so they get big tiles. Labelled
  // options (quizzes, later) get full-width rows with the letter badge.
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
        return (
          <button
            key={index}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={lettersOnly ? letter : `${letter}: ${label}`}
            disabled={disabled}
            onClick={() => choose(index)}
            className={
              "relative flex w-full items-center gap-3 rounded-md border border-l-4 border-border text-left " +
              "transition-[background-color,box-shadow,transform] duration-150 ease-brand " +
              "motion-safe:active:translate-y-0.5 disabled:opacity-60 " +
              `${style.edge} ` +
              (lettersOnly ? "h-24 justify-center " : "min-h-13 px-3 ") +
              (isSelected ? `ring-2 ring-inset ${style.selected}` : "bg-surface hover:bg-surface-2")
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
            {isSelected && (
              <Check
                className={
                  "size-5 text-text " +
                  (lettersOnly ? "absolute top-2 right-2" : "ml-auto shrink-0")
                }
                strokeWidth={2.25}
                aria-hidden
              />
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
  labelledBy,
  onSubmit,
}: {
  saved: string | null;
  current: string | null;
  disabled: boolean;
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
        value={draft}
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
      <Button type="submit" size="lg" className="mt-3 h-13 w-full" disabled={disabled || unchanged}>
        {saved !== null || current !== null ? "Update answer" : "Submit answer"}
      </Button>
    </form>
  );
}

/** "Answer saved ✓", or why not yet (PRD S4). Announced politely. */
function SaveLine({ status, locked }: { status: SaveStatus; locked: boolean }) {
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
        Your answer is locked.
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
