"use client";

import { ArrowDown, ArrowUp, Check, Plus, Trash2, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { ANSWER_LETTERS, answerStyles } from "@/components/ui/answer-colors";
import { Button, IconButton } from "@/components/ui/button";
import { inputStyles, TextAreaField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { Segmented } from "@/components/ui/segmented";
import {
  ACCEPTED_MAX,
  CHOICE_MAX,
  draftItem,
  EXPLANATION_MAX,
  MAX_ACCEPTED,
  MAX_CHOICES,
  MIN_CHOICES,
  PROMPT_MAX,
  type DraftItem,
  type DraftQuestion,
  type QuestionErrors,
} from "@/lib/quiz-draft";
import type { QuestionType } from "@/lib/types";

export const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: "MC", label: "Multiple choice" },
  { value: "TF", label: "True or false" },
  { value: "SA", label: "Short answer" },
];

/** Error slots to clear after an edit; "*" clears every error of the question. */
export type Cleared = string[] | "*";

type Props = {
  question: DraftQuestion;
  index: number;
  total: number;
  errors: QuestionErrors;
  /** Focus the prompt when mounted: the question was just added. */
  autoFocus: boolean;
  onChange: (update: (question: DraftQuestion) => DraftQuestion, cleared: Cleared) => void;
  onMove: (delta: -1 | 1) => void;
  onRemove: () => void;
};

const NOT_SCORED = "With no correct answer, this question isn't scored.";

/** One question in the quiz editor (PRD Q2–Q5). */
export function QuestionCard({
  question,
  index,
  total,
  errors,
  autoFocus,
  onChange,
  onMove,
  onRemove,
}: Props) {
  const id = useId();
  const headingId = `${id}-heading`;
  const number = index + 1;
  const [showExplanation, setShowExplanation] = useState(question.explanation !== "");
  const cardError = errors.question ?? errors.type;

  return (
    <section
      aria-labelledby={headingId}
      data-question={question.key}
      className={
        "rounded-lg border bg-surface " +
        (Object.keys(errors).length ? "border-danger/40" : "border-border")
      }
    >
      {/* On phones the type select wraps onto its own row below the number and actions. */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-border py-2 pr-2 pl-4 sm:flex-nowrap sm:gap-x-3 sm:pl-5">
        <h2 id={headingId} className="shrink-0 text-body-lg font-semibold text-text">
          Question <span className="font-mono tabular-nums">{number}</span>
        </h2>
        <label className="sr-only" htmlFor={`${id}-type`}>
          Question {number} type
        </label>
        <select
          id={`${id}-type`}
          value={question.type}
          onChange={(event) => {
            const type = event.target.value as QuestionType;
            onChange((q) => ({ ...q, type }), "*");
          }}
          className={
            "order-last mr-2 mb-1 h-10 basis-full rounded-md border border-border-strong bg-surface px-2 " +
            "text-body text-text-muted sm:order-none sm:mr-0 sm:mb-0 sm:h-9 sm:basis-auto " +
            "transition-colors duration-150 ease-brand hover:border-text-subtle hover:text-text"
          }
        >
          {QUESTION_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
        <div className="ml-auto flex shrink-0 items-center">
          <IconButton
            label={`Move question ${number} up`}
            data-action="up"
            disabled={index === 0}
            onClick={() => onMove(-1)}
          >
            <ArrowUp className="size-4" strokeWidth={1.75} aria-hidden />
          </IconButton>
          <IconButton
            label={`Move question ${number} down`}
            data-action="down"
            disabled={index === total - 1}
            onClick={() => onMove(1)}
          >
            <ArrowDown className="size-4" strokeWidth={1.75} aria-hidden />
          </IconButton>
          <IconButton
            label={
              total === 1 ? "A quiz needs at least one question" : `Delete question ${number}`
            }
            disabled={total === 1}
            onClick={onRemove}
            className="hover:text-danger"
          >
            <Trash2 className="size-4" strokeWidth={1.75} aria-hidden />
          </IconButton>
        </div>
      </div>

      <div className="space-y-5 p-4 sm:p-5">
        {cardError && <Notice tone="danger">{cardError}</Notice>}

        <TextAreaField
          label="Question"
          value={question.prompt}
          onChange={(event) => {
            const prompt = event.target.value;
            onChange((q) => ({ ...q, prompt }), ["prompt"]);
          }}
          maxLength={PROMPT_MAX}
          rows={2}
          placeholder={PLACEHOLDERS[question.type]}
          error={errors.prompt}
          autoFocus={autoFocus}
          required
        />

        {question.type === "MC" && (
          <ChoicesEditor question={question} errors={errors} onChange={onChange} />
        )}

        {question.type === "TF" && (
          <Segmented
            label="Correct answer"
            name={`${id}-tf`}
            value={question.tfCorrect === null ? "none" : String(question.tfCorrect)}
            onChange={(value) => {
              const tfCorrect = value === "none" ? null : Number(value);
              onChange((q) => ({ ...q, tfCorrect }), ["correct"]);
            }}
            options={[
              { value: "0", label: "True" },
              { value: "1", label: "False" },
              { value: "none", label: "No correct answer" },
            ]}
            error={errors.correct}
            hint={question.tfCorrect === null ? NOT_SCORED : undefined}
          />
        )}

        {question.type === "SA" && (
          <AcceptedAnswersEditor question={question} errors={errors} onChange={onChange} />
        )}

        {showExplanation || question.explanation || errors.explanation ? (
          <TextAreaField
            label="Explanation (optional)"
            value={question.explanation}
            onChange={(event) => {
              const explanation = event.target.value;
              onChange((q) => ({ ...q, explanation }), ["explanation"]);
            }}
            maxLength={EXPLANATION_MAX}
            rows={2}
            hint="Students see this after answering, when feedback is on."
            error={errors.explanation}
            autoFocus={showExplanation && !question.explanation}
          />
        ) : (
          <Button variant="ghost" className="-ml-3" onClick={() => setShowExplanation(true)}>
            <Plus className="size-4" strokeWidth={1.75} aria-hidden />
            Add explanation
          </Button>
        )}
      </div>
    </section>
  );
}

const PLACEHOLDERS: Record<QuestionType, string> = {
  MC: "Which organelle produces most of a cell's ATP?",
  TF: "Plant cells have a cell wall.",
  SA: "What gas do plants take in during photosynthesis?",
};

type EditorProps = Pick<Props, "question" | "errors" | "onChange">;

/**
 * Focuses the input of a list item after the render that added it, or on Enter in the
 * previous one. Inputs carry `data-item={key}`.
 */
function useItemFocus() {
  const listRef = useRef<HTMLDivElement>(null);
  const pending = useRef<string | null>(null);

  useEffect(() => {
    if (!pending.current) return;
    listRef.current?.querySelector<HTMLInputElement>(`[data-item="${pending.current}"]`)?.focus();
    pending.current = null;
  });

  return {
    listRef,
    focusItem: (key: string) => {
      pending.current = key;
    },
  };
}

function ChoicesEditor({ question, errors, onChange }: EditorProps) {
  const { choices, mcCorrect } = question;
  const { listRef, focusItem } = useItemFocus();
  const messageId = useId();
  const listMessage = errors.choices ?? errors.correct;
  const message = listMessage ?? (mcCorrect === null ? NOT_SCORED : null);

  function addAfter(position: number) {
    const item = draftItem();
    focusItem(item.key);
    onChange(
      (q) => ({
        ...q,
        choices: [...q.choices.slice(0, position + 1), item, ...q.choices.slice(position + 1)],
        mcCorrect: q.mcCorrect !== null && q.mcCorrect > position ? q.mcCorrect + 1 : q.mcCorrect,
      }),
      ["choices", "correct"],
    );
  }

  function remove(item: DraftItem, position: number) {
    const next = choices[position + 1] ?? choices[position - 1];
    if (next) focusItem(next.key);
    onChange(
      (q) => ({
        ...q,
        choices: q.choices.filter((c) => c.key !== item.key),
        mcCorrect:
          q.mcCorrect === position
            ? null
            : q.mcCorrect !== null && q.mcCorrect > position
              ? q.mcCorrect - 1
              : q.mcCorrect,
      }),
      ["choices", "correct", `choice:${item.key}`],
    );
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>, position: number) {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    event.preventDefault();
    const next = choices[position + 1];
    if (next) {
      listRef.current?.querySelector<HTMLInputElement>(`[data-item="${next.key}"]`)?.focus();
    } else if (choices.length < MAX_CHOICES) {
      addAfter(position);
    }
  }

  return (
    <fieldset aria-describedby={message ? messageId : undefined}>
      <legend className="text-label font-medium text-text">Choices</legend>
      <div ref={listRef} className="mt-1.5 space-y-2">
        {choices.map((choice, position) => {
          const letter = ANSWER_LETTERS[position];
          const correct = mcCorrect === position;
          const itemError = errors[`choice:${choice.key}`];
          const errorId = `${messageId}-${choice.key}`;
          return (
            <div key={choice.key}>
              <div className="flex items-center gap-2">
                <span
                  aria-hidden
                  className={`flex size-7 shrink-0 items-center justify-center rounded-sm font-mono text-label font-semibold ${answerStyles[letter].badge}`}
                >
                  {letter}
                </span>
                <input
                  data-item={choice.key}
                  aria-label={`Choice ${letter}`}
                  aria-invalid={itemError ? true : undefined}
                  aria-describedby={itemError ? errorId : undefined}
                  value={choice.text}
                  onChange={(event) => {
                    const text = event.target.value;
                    onChange(
                      (q) => ({
                        ...q,
                        choices: q.choices.map((c) => (c.key === choice.key ? { ...c, text } : c)),
                      }),
                      ["choices", `choice:${choice.key}`],
                    );
                  }}
                  onKeyDown={(event) => onKeyDown(event, position)}
                  maxLength={CHOICE_MAX}
                  placeholder={`Choice ${letter}`}
                  enterKeyHint="next"
                  autoComplete="off"
                  className={`h-11 min-w-0 flex-1 ${inputStyles(Boolean(itemError))}`}
                />
                <button
                  type="button"
                  aria-pressed={correct}
                  aria-label={`${letter} is the correct answer`}
                  title={correct ? "Correct answer. Click to unmark." : "Mark as the correct answer"}
                  onClick={() =>
                    onChange((q) => ({ ...q, mcCorrect: correct ? null : position }), ["correct"])
                  }
                  className={
                    "inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-md border px-3 " +
                    "text-body font-medium transition-colors duration-150 ease-brand " +
                    (correct
                      ? "border-success/40 bg-success-subtle text-success"
                      : "border-border-strong bg-surface text-text-subtle hover:bg-surface-2 hover:text-text")
                  }
                >
                  <Check
                    className={`size-4 ${correct ? "" : "opacity-40"}`}
                    strokeWidth={2}
                    aria-hidden
                  />
                  <span className="hidden sm:inline">Correct</span>
                </button>
                <IconButton
                  label={`Remove choice ${letter}`}
                  disabled={choices.length <= MIN_CHOICES}
                  onClick={() => remove(choice, position)}
                >
                  <X className="size-4" strokeWidth={1.75} aria-hidden />
                </IconButton>
              </div>
              {itemError && (
                <p id={errorId} className="mt-1.5 pl-9 text-body text-danger">
                  {itemError}
                </p>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        <Button
          variant="ghost"
          className="-ml-3"
          disabled={choices.length >= MAX_CHOICES}
          onClick={() => addAfter(choices.length - 1)}
        >
          <Plus className="size-4" strokeWidth={1.75} aria-hidden />
          {choices.length >= MAX_CHOICES ? `${MAX_CHOICES} choices at most` : "Add choice"}
        </Button>
      </div>
      {message && (
        <p
          id={messageId}
          className={`mt-1 text-body ${listMessage ? "text-danger" : "text-text-subtle"}`}
        >
          {message}
        </p>
      )}
    </fieldset>
  );
}

function AcceptedAnswersEditor({ question, errors, onChange }: EditorProps) {
  const answers = question.acceptedAnswers;
  const { listRef, focusItem } = useItemFocus();
  const messageId = useId();
  const listError = errors.accepted;
  const message =
    listError ??
    (answers.length === 0
      ? "Leave empty to collect answers without scoring them."
      : "Matching ignores capitals and extra spaces.");

  function add() {
    const item = draftItem();
    focusItem(item.key);
    onChange((q) => ({ ...q, acceptedAnswers: [...q.acceptedAnswers, item] }), ["accepted"]);
  }

  function remove(item: DraftItem, position: number) {
    const next = answers[position + 1] ?? answers[position - 1];
    if (next) focusItem(next.key);
    onChange(
      (q) => ({ ...q, acceptedAnswers: q.acceptedAnswers.filter((a) => a.key !== item.key) }),
      ["accepted", `accepted:${item.key}`],
    );
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>, position: number) {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    event.preventDefault();
    const next = answers[position + 1];
    if (next) {
      listRef.current?.querySelector<HTMLInputElement>(`[data-item="${next.key}"]`)?.focus();
    } else if (answers.length < MAX_ACCEPTED) {
      add();
    }
  }

  return (
    <fieldset aria-describedby={messageId}>
      <legend className="text-label font-medium text-text">Accepted answers (optional)</legend>
      {answers.length > 0 && (
        <div ref={listRef} className="mt-1.5 space-y-2">
          {answers.map((answer, position) => {
            const itemError = errors[`accepted:${answer.key}`];
            const errorId = `${messageId}-${answer.key}`;
            return (
              <div key={answer.key}>
                <div className="flex items-center gap-2">
                  <input
                    data-item={answer.key}
                    aria-label={`Accepted answer ${position + 1}`}
                    aria-invalid={itemError ? true : undefined}
                    aria-describedby={itemError ? errorId : undefined}
                    value={answer.text}
                    onChange={(event) => {
                      const text = event.target.value;
                      onChange(
                        (q) => ({
                          ...q,
                          acceptedAnswers: q.acceptedAnswers.map((a) =>
                            a.key === answer.key ? { ...a, text } : a,
                          ),
                        }),
                        ["accepted", `accepted:${answer.key}`],
                      );
                    }}
                    onKeyDown={(event) => onKeyDown(event, position)}
                    maxLength={ACCEPTED_MAX}
                    placeholder={position === 0 ? "Carbon dioxide" : "Another way to say it"}
                    enterKeyHint="next"
                    autoComplete="off"
                    className={`h-11 min-w-0 flex-1 ${inputStyles(Boolean(itemError))}`}
                  />
                  <IconButton
                    label={`Remove accepted answer ${position + 1}`}
                    onClick={() => remove(answer, position)}
                  >
                    <X className="size-4" strokeWidth={1.75} aria-hidden />
                  </IconButton>
                </div>
                {itemError && (
                  <p id={errorId} className="mt-1.5 text-body text-danger">
                    {itemError}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
      <Button
        variant="ghost"
        className="mt-2 -ml-3"
        disabled={answers.length >= MAX_ACCEPTED}
        onClick={add}
      >
        <Plus className="size-4" strokeWidth={1.75} aria-hidden />
        {answers.length >= MAX_ACCEPTED
          ? `${MAX_ACCEPTED} answers at most`
          : "Add accepted answer"}
      </Button>
      <p id={messageId} className={`mt-1 text-body ${listError ? "text-danger" : "text-text-subtle"}`}>
        {message}
      </p>
    </fieldset>
  );
}
