"use client";

import { Check, ChevronLeft, ChevronRight, CircleCheck, LayoutGrid, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ANSWER_LETTERS } from "@/components/ui/answer-colors";
import { Button } from "@/components/ui/button";
import { Dialog, DialogActions } from "@/components/ui/dialog";
import { Notice } from "@/components/ui/notice";
import { ApiError, errorMessage } from "@/lib/api";
import { readSession } from "@/lib/student-session";
import { studentApi } from "@/lib/student-api";
import type { ParticipantState, StudentQuestion } from "@/lib/types";
import {
  DEFAULT_PROMPT,
  FeedbackPanel,
  QuestionView,
  type QuestionProgress,
} from "./question-view";
import { MessageScreen } from "./student-shell";

/** Above this many questions, the progress segments get too thin to read. */
const MAX_SEGMENTS = 20;

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

type Result = "correct" | "incorrect" | "answered" | "open";

/**
 * A student-paced quiz (PRD A1, A2): every question, in any order, at the student's own
 * speed. Moving around is client-side only. Answers can change until Finish, unless
 * feedback is on (then each locks when checked). Finish asks first, since it's final.
 */
export function StudentPaced({
  code,
  state,
  onReplace,
  onStale,
}: {
  code: string;
  state: ParticipantState;
  /** Shows the state the finish request returned. */
  onReplace: (next: ParticipantState) => void;
  onStale: () => void;
}) {
  if (state.participant.finished_at) return <Finished state={state} />;
  return <Questions code={code} state={state} onReplace={onReplace} onStale={onStale} />;
}

function Questions({
  code,
  state,
  onReplace,
  onStale,
}: {
  code: string;
  state: ParticipantState;
  onReplace: (next: ParticipantState) => void;
  onStale: () => void;
}) {
  const { activity, questions } = state;
  const total = questions.length;
  // Back where they were after a refresh, near enough: the first question left to answer.
  const [index, setIndex] = useState(() =>
    Math.max(
      0,
      questions.findIndex((q) => q.response === null),
    ),
  );
  const [progress, setProgress] = useState<Record<number, QuestionProgress>>({});
  const [gridOpen, setGridOpen] = useState(false);
  const [finishing, setFinishing] = useState<"confirm" | "pending" | null>(null);
  const [finishError, setFinishError] = useState<string | null>(null);
  const moved = useRef(false);
  const gridId = useId();

  const onProgress = useCallback((questionId: number, next: QuestionProgress) => {
    setProgress((all) => {
      const known = all[questionId];
      if (
        known &&
        known.answered === next.answered &&
        known.busy === next.busy &&
        known.correct === next.correct
      ) {
        return all;
      }
      return { ...all, [questionId]: next };
    });
  }, []);

  const resultOf = (question: StudentQuestion): Result => {
    const known = progress[question.id];
    const answered = known?.answered ?? question.response !== null;
    if (!answered) return "open";
    const correct = known?.correct ?? question.response?.feedback?.is_correct;
    return correct === true ? "correct" : correct === false ? "incorrect" : "answered";
  };
  const results = questions.map(resultOf);
  const answeredCount = results.filter((r) => r !== "open").length;
  const unanswered = total - answeredCount;
  const saving = Object.values(progress).some((p) => p.busy);
  const current = questions[Math.min(index, total - 1)];
  const currentAnswered = results[index] !== "open";
  const isLast = index >= total - 1;

  // After moving, start the new question from the top, and tell screen readers where they are.
  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    window.scrollTo({ top: 0 });
    document
      .getElementById(`question-${current.id}`)
      ?.querySelector("h1")
      ?.focus({ preventScroll: true });
  }, [current.id]);

  function go(target: number) {
    if (target < 0 || target >= total || target === index) return;
    moved.current = true;
    setIndex(target);
  }

  async function finish() {
    setFinishing("pending");
    setFinishError(null);
    const token = readSession(code)?.token;
    if (!token) {
      onStale();
      setFinishing(null);
      return;
    }
    try {
      onReplace(await studentApi.finish(token));
      setFinishing(null);
    } catch (error) {
      // Ended, not student-paced after all, or the token went: the screen is out of date.
      if (error instanceof ApiError && [401, 404, 409].includes(error.status)) {
        onStale();
        setFinishing(null);
        return;
      }
      setFinishError(errorMessage(error));
      setFinishing("confirm");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p aria-live="polite" className="text-body-lg text-text-muted">
          Question{" "}
          <span className="font-mono font-semibold text-text tabular-nums">{index + 1}</span> of{" "}
          <span className="font-mono tabular-nums">{total}</span>
        </p>
        <Button
          variant="ghost"
          className="-mr-3 h-11"
          aria-expanded={gridOpen}
          aria-controls={gridId}
          onClick={() => setGridOpen((open) => !open)}
        >
          <LayoutGrid className="size-4" strokeWidth={1.75} aria-hidden />
          All questions
        </Button>
      </div>

      <ProgressStrip results={results} index={index} />

      {gridOpen && (
        <div
          id={gridId}
          className="mt-4 rounded-lg border border-border bg-surface p-4 motion-safe:animate-fade-in"
        >
          <p className="text-body text-text-muted">
            <span className="font-medium text-text tabular-nums">{answeredCount}</span> of{" "}
            <span className="tabular-nums">{total}</span> answered. Tap a number to go there.
          </p>
          <ol className="mt-3 grid grid-cols-5 gap-2">
            {questions.map((question, i) => (
              <li key={question.id}>
                <QuestionChip
                  number={i + 1}
                  result={results[i]}
                  current={i === index}
                  onClick={() => {
                    go(i);
                    setGridOpen(false);
                  }}
                />
              </li>
            ))}
          </ol>
          <Button
            variant="secondary"
            size="lg"
            className="mt-4 h-12 w-full"
            onClick={() => setFinishing("confirm")}
          >
            Finish quiz
          </Button>
        </div>
      )}

      <div className="mt-6">
        {questions.map((question, i) => (
          // Every question stays mounted, so an answer still saving keeps retrying while
          // the student moves on (PRD S4). Only the current one shows.
          <div key={question.id} id={`question-${question.id}`} hidden={i !== index}>
            <QuestionView
              code={code}
              activityId={activity.id}
              question={question}
              questionCount={total}
              numbered={false}
              feedbackOn={activity.show_feedback}
              onProgress={onProgress}
              onStale={onStale}
            />
          </div>
        ))}
      </div>

      {!activity.show_feedback && (
        <p className="mt-1 text-body text-text-muted">
          You can change your answers until you finish.
        </p>
      )}

      <nav aria-label="Questions" className="mt-8 grid grid-cols-2 gap-3">
        <Button
          variant="secondary"
          size="lg"
          className="h-13"
          disabled={index === 0}
          onClick={() => go(index - 1)}
        >
          <ChevronLeft className="size-5" strokeWidth={1.75} aria-hidden />
          Previous
        </Button>
        {isLast ? (
          <Button
            variant={currentAnswered ? "primary" : "secondary"}
            size="lg"
            className="h-13"
            onClick={() => setFinishing("confirm")}
          >
            Finish quiz
          </Button>
        ) : (
          <Button
            variant={currentAnswered ? "primary" : "secondary"}
            size="lg"
            className="h-13"
            onClick={() => go(index + 1)}
          >
            Next
            <ChevronRight className="size-5" strokeWidth={1.75} aria-hidden />
          </Button>
        )}
      </nav>

      {finishing && (
        <Dialog
          title="Finish the quiz?"
          description={
            unanswered > 0
              ? `You haven't answered ${plural(unanswered, "question")}. Once you finish, you can't change your answers.`
              : "Once you finish, you can't change your answers."
          }
          onClose={() => setFinishing(null)}
          busy={finishing === "pending"}
        >
          {saving && finishing === "confirm" && (
            <Notice>Saving your last answer. Finish will be ready in a moment.</Notice>
          )}
          {finishError && <Notice tone="danger">{finishError}</Notice>}
          <DialogActions>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setFinishing(null)}
              disabled={finishing === "pending"}
            >
              Keep working
            </Button>
            <Button
              size="lg"
              onClick={() => void finish()}
              // Finishing locks answers, so one still on its way would be refused.
              disabled={finishing === "pending" || saving}
            >
              {finishing === "pending"
                ? "Finishing…"
                : saving
                  ? "Saving…"
                  : unanswered > 0
                    ? "Finish anyway"
                    : "Finish quiz"}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </div>
  );
}

const segmentTones: Record<Result, string> = {
  correct: "bg-success",
  incorrect: "bg-danger",
  answered: "bg-accent",
  open: "bg-border-strong",
};

/** One segment per question, filled once answered; the current one stands taller. */
function ProgressStrip({ results, index }: { results: Result[]; index: number }) {
  const total = results.length;
  if (total > MAX_SEGMENTS) {
    const answered = results.filter((r) => r !== "open").length;
    return (
      <div aria-hidden className="mt-3 h-1 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-accent transition-transform duration-220 ease-brand motion-reduce:transition-none"
          style={{ transform: `translateX(${(answered / total) * 100 - 100}%)` }}
        />
      </div>
    );
  }
  return (
    <div aria-hidden className="mt-3 flex h-2 items-center gap-1">
      {results.map((result, i) => (
        <span
          key={i}
          className={
            "flex-1 rounded-full transition-[background-color,height] duration-220 ease-brand " +
            (i === index ? "h-2 " : "h-1 ") +
            (i === index && result === "open" ? "bg-text-subtle" : segmentTones[result])
          }
        />
      ))}
    </div>
  );
}

const chipTones: Record<Result, string> = {
  correct: "border-success/30 bg-success-subtle text-success",
  incorrect: "border-danger/30 bg-danger-subtle text-danger",
  answered: "border-accent/40 bg-accent-subtle text-text",
  open: "border-border-strong bg-surface text-text-muted hover:bg-surface-2",
};

const resultLabels: Record<Result, string> = {
  correct: "answered, correct",
  incorrect: "answered, incorrect",
  answered: "answered",
  open: "not answered",
};

function QuestionChip({
  number,
  result,
  current,
  onClick,
}: {
  number: number;
  result: Result;
  current: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={current ? "step" : undefined}
      aria-label={`Question ${number}, ${resultLabels[result]}`}
      className={
        "relative flex h-11 w-full items-center justify-center rounded-md border font-mono text-body-lg " +
        "font-semibold tabular-nums transition-colors duration-150 ease-brand " +
        chipTones[result] +
        (current ? " ring-2 ring-text ring-offset-2 ring-offset-surface" : "")
      }
    >
      {number}
      {result === "correct" && (
        <Check className="absolute top-0.5 right-0.5 size-3" strokeWidth={3} aria-hidden />
      )}
      {result === "incorrect" && (
        <X className="absolute top-0.5 right-0.5 size-3" strokeWidth={3} aria-hidden />
      )}
      {result === "answered" && (
        <span className="absolute top-1 right-1 size-1.5 rounded-full bg-accent" aria-hidden />
      )}
    </button>
  );
}

/** The student's answer, as they'd recognise it. */
function answerLabel(question: StudentQuestion): string {
  const response = question.response;
  if (!response) return "";
  if (question.type === "SA") return response.text_answer;
  const index = response.choice_index ?? -1;
  const label = question.choices[index] ?? "";
  const letter = ANSWER_LETTERS[index];
  return question.type === "TF" || label === letter ? label : `${letter}: ${label}`;
}

/**
 * After Finish. Without feedback, just "you're done" (answers are never revealed). With
 * feedback, the score and a review of every question with its explanation.
 */
function Finished({ state }: { state: ParticipantState }) {
  const { questions, activity } = state;
  const answered = questions.filter((q) => q.response !== null).length;

  if (!activity.show_feedback) {
    return (
      <MessageScreen icon={CircleCheck} title="You're done">
        You answered {answered} of {plural(questions.length, "question")}. Stay here for the next
        activity. It opens on its own.
      </MessageScreen>
    );
  }

  const graded = questions.map((q) => q.response?.feedback?.is_correct);
  const right = graded.filter((c) => c === true).length;
  const wrong = graded.filter((c) => c === false).length;
  const skipped = questions.length - answered;

  return (
    <div className="motion-safe:animate-fade-in">
      <div className="flex flex-col items-center text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-surface-2">
          <CircleCheck className="size-6 text-text-subtle" strokeWidth={1.75} aria-hidden />
        </div>
        <h1 className="mt-5 text-h2 font-semibold text-text">You&apos;re done</h1>
        <p className="mt-2 text-body-lg text-text-muted">
          Stay here for the next activity. It opens on its own.
        </p>
      </div>

      <dl className="mt-8 grid grid-cols-3 divide-x divide-border rounded-lg border border-border bg-surface">
        <Stat label="Correct" value={right} className="text-success" />
        <Stat label="Incorrect" value={wrong} className="text-danger" />
        <Stat label="Skipped" value={skipped} className="text-text-muted" />
      </dl>

      <h2 className="mt-10 text-h3 font-semibold text-text">Review</h2>
      <ol className="mt-4 space-y-6">
        {questions.map((question, i) => (
          <li key={question.id} className="border-t border-border pt-5">
            <p className="text-body text-text-subtle tabular-nums">Question {i + 1}</p>
            <p className="mt-1 text-body-lg font-medium break-words text-text">
              {question.prompt || DEFAULT_PROMPT}
            </p>
            {question.response ? (
              <>
                <p className="mt-2 text-body-lg text-text-muted">
                  Your answer: <span className="text-text">{answerLabel(question)}</span>
                </p>
                {question.response.feedback && (
                  <FeedbackPanel
                    question={question}
                    feedback={question.response.feedback}
                    live={false}
                    className="mt-3"
                  />
                )}
              </>
            ) : (
              <p className="mt-2 text-body-lg text-text-muted">Not answered</p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

function Stat({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <div className="px-3 py-4 text-center">
      <dt className="text-caption text-text-subtle">{label}</dt>
      <dd className={`mt-1 font-mono text-h1 font-semibold tabular-nums ${className}`}>{value}</dd>
    </div>
  );
}
