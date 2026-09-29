"use client";

import { ListChecks } from "lucide-react";
import { useEffect, useId, useState, type FormEvent } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Dialog, DialogActions } from "@/components/ui/dialog";
import { Notice } from "@/components/ui/notice";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { activitiesApi, findStartedActivity } from "@/lib/activities-api";
import { ApiError, errorMessage } from "@/lib/api";
import { quizzesApi } from "@/lib/quizzes-api";
import type { ActivityMode, QuizListItem, TeacherState } from "@/lib/types";

type QuizzesState =
  | { status: "loading" }
  | { status: "ready"; quizzes: QuizListItem[] }
  | { status: "error"; message: string };

const MODES: { value: ActivityMode; label: string }[] = [
  { value: "TEACHER_PACED", label: "Teacher-paced" },
  { value: "STUDENT_PACED", label: "Student-paced" },
];

const MODE_HINTS: Record<ActivityMode, string> = {
  TEACHER_PACED: "Everyone sees the same question, and you move the class on.",
  STUDENT_PACED:
    "Each student works through every question at their own speed, then presses Finish.",
};

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

/**
 * Starts a saved quiz in the room (PRD A1, A2): pick the quiz, the mode, and whether
 * students see the right answer after each one. As with quick questions, the button is the
 * confirm when something is already live.
 */
export function StartQuizDialog({
  roomId,
  liveActivityId,
  onStarted,
  onClose,
}: {
  roomId: number;
  /** The activity running now, if any. Starting ends it. */
  liveActivityId: number | null;
  onStarted: (state: TeacherState) => void;
  onClose: () => void;
}) {
  const [quizzes, setQuizzes] = useState<QuizzesState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [quizId, setQuizId] = useState<number | null>(null);
  const [mode, setMode] = useState<ActivityMode>("TEACHER_PACED");
  const [showFeedback, setShowFeedback] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listLabelId = useId();

  useEffect(() => {
    const controller = new AbortController();
    quizzesApi.list({ signal: controller.signal }).then(
      (list) => {
        setQuizzes({ status: "ready", quizzes: list });
        // The most recently edited quiz is the likeliest one to run.
        setQuizId((current) =>
          current !== null && list.some((q) => q.id === current) ? current : (list[0]?.id ?? null),
        );
      },
      (err: unknown) => {
        if (!controller.signal.aborted) setQuizzes({ status: "error", message: errorMessage(err) });
      },
    );
    return () => controller.abort();
  }, [attempt]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (quizId === null) return;
    setPending(true);
    setError(null);
    try {
      onStarted(
        await activitiesApi.startQuiz(roomId, {
          quiz_id: quizId,
          mode,
          show_feedback: showFeedback,
        }),
      );
    } catch (err) {
      if (err instanceof ApiError && err.code === "network_error") {
        // Not idempotent: look before offering a retry that would end what just started.
        const started = await findStartedActivity(roomId, liveActivityId);
        if (started) {
          onStarted(started);
          return;
        }
      }
      if (err instanceof ApiError && err.code === "quiz_not_found") {
        setError("That quiz no longer exists. It may have been deleted in another tab.");
        setAttempt((n) => n + 1);
      } else {
        setError(errorMessage(err));
      }
      setPending(false);
    }
  }

  const list = quizzes.status === "ready" ? quizzes.quizzes : null;

  let picker;
  if (quizzes.status === "loading") {
    picker = (
      <div aria-busy="true" aria-label="Loading quizzes" className="space-y-2">
        <Skeleton className="h-14" />
        <Skeleton className="h-14" />
        <Skeleton className="h-14" />
      </div>
    );
  } else if (quizzes.status === "error") {
    picker = (
      <div>
        <Notice tone="danger">Couldn&apos;t load your quizzes. {quizzes.message}</Notice>
        <Button
          variant="secondary"
          className="mt-3"
          onClick={() => {
            setQuizzes({ status: "loading" });
            setAttempt((n) => n + 1);
          }}
        >
          Try again
        </Button>
      </div>
    );
  } else if (list && list.length === 0) {
    picker = (
      <div className="flex flex-col items-center rounded-lg border border-border px-4 py-8 text-center">
        <div className="flex size-11 items-center justify-center rounded-full bg-surface-2">
          <ListChecks className="size-5 text-text-subtle" strokeWidth={1.75} aria-hidden />
        </div>
        <p className="mt-4 text-body text-text-muted">
          No quizzes yet. Write one, then run it in any room.
        </p>
        <ButtonLink href="/teacher/quizzes/new" variant="secondary" className="mt-4">
          New quiz
        </ButtonLink>
      </div>
    );
  } else if (list) {
    picker = (
      <div
        role="radiogroup"
        aria-labelledby={listLabelId}
        className="-mx-1 max-h-72 space-y-2 overflow-y-auto px-1 py-1"
      >
        {list.map((quiz) => (
          <label
            key={quiz.id}
            className={
              "flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-md border px-4 py-2.5 " +
              "transition-colors duration-150 ease-brand hover:bg-surface-2 " +
              "has-checked:border-accent has-checked:bg-accent-subtle " +
              "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent " +
              "border-border-strong"
            }
          >
            <input
              type="radio"
              name="quiz"
              className="sr-only"
              checked={quiz.id === quizId}
              onChange={() => setQuizId(quiz.id)}
            />
            <span className="min-w-0 truncate text-body-lg font-medium text-text">{quiz.title}</span>
            <span className="shrink-0 text-body text-text-muted tabular-nums">
              {plural(quiz.question_count, "question")}
            </span>
          </label>
        ))}
      </div>
    );
  }

  return (
    <Dialog
      title="Start a quiz"
      description="Students answer on their phones. Results come in live."
      onClose={onClose}
      busy={pending}
    >
      <form onSubmit={(event) => void onSubmit(event)} noValidate className="space-y-5">
        <div>
          <p id={listLabelId} className="mb-1.5 text-label font-medium text-text">
            Quiz
          </p>
          {picker}
        </div>

        <Segmented
          label="Mode"
          name="mode"
          value={mode}
          onChange={setMode}
          options={MODES}
          hint={MODE_HINTS[mode]}
        />

        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={showFeedback}
            onChange={(event) => setShowFeedback(event.target.checked)}
            className="mt-0.5 size-4 shrink-0 cursor-pointer accent-accent"
          />
          <span>
            <span className="block text-body font-medium text-text">
              Show the correct answer after each response
            </span>
            <span className="mt-0.5 block text-body text-text-subtle">
              Students see right or wrong and your explanation, and can&apos;t change that answer.
            </span>
          </span>
        </label>

        {liveActivityId !== null && (
          <Notice tone="warning">
            This ends the activity that&apos;s running now. Answers so far are kept.
          </Notice>
        )}
        {error && <Notice tone="danger">{error}</Notice>}

        <DialogActions>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending || quizId === null}>
            {pending
              ? "Starting…"
              : liveActivityId !== null
                ? "End current and start"
                : "Start quiz"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
