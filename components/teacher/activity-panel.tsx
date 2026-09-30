"use client";

import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  ListChecks,
  Radio,
  SquareCheckBig,
  Square,
  Users,
  Zap,
} from "lucide-react";
import { useId, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Dialog, DialogActions } from "@/components/ui/dialog";
import { Notice } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/skeleton";
import { activitiesApi, findStartedActivity } from "@/lib/activities-api";
import { ApiError, errorMessage } from "@/lib/api";
import type { QuestionType, TeacherState } from "@/lib/types";
import type { ActivityState } from "@/lib/use-activity-state";
import { ActivityResults, shownQuestion } from "./activity-results";
import { QuickQuestionDialog } from "./quick-question-dialog";
import { StartQuizDialog } from "./start-quiz-dialog";

export const TYPE_LABELS: Record<QuestionType, string> = {
  MC: "Multiple choice",
  TF: "True or false",
  SA: "Short answer",
};

/**
 * The room's activity (PRD QQ1–QQ5, A1, L2): start a quick question or a quiz, watch
 * the answers come in, move a teacher-paced quiz along (or pick which question to chart in
 * a student-paced one), end it. After it ends, the final results stay until the next one
 * starts.
 */
export function ActivityPanel({
  roomId,
  activity,
  selectedIndex,
  onSelect,
}: {
  roomId: number;
  activity: ActivityState<TeacherState>;
  /** Student-paced: the question charted. */
  selectedIndex: number;
  onSelect: (index: number) => void;
}) {
  const [starting, setStarting] = useState<"quick" | "quiz" | null>(null);
  const [ending, setEnding] = useState<"confirm" | "pending" | null>(null);
  const [endError, setEndError] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);

  const { state } = activity;
  const live = state?.activity.status === "LIVE" ? state.activity : null;
  const question = state ? shownQuestion(state, selectedIndex)?.question : null;
  const isQuiz = state?.activity.type === "QUIZ";
  const studentPaced = isQuiz && state?.activity.mode === "STUDENT_PACED";
  // A LIVE short answer quick question can become a vote on its answers (PRD QQ4).
  const canVote = live !== null && !isQuiz && question?.type === "SA";
  const distinctAnswers = state?.summaries[0]?.text_counts.length ?? 0;

  function started(next: TeacherState) {
    activity.replace(next);
    setStarting(null);
  }

  async function end() {
    if (!live) return;
    setEnding("pending");
    setEndError(null);
    try {
      activity.replace(await activitiesApi.end(live.id));
      setEnding(null);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        activity.refetch();
        setEnding(null);
        return;
      }
      setEndError(errorMessage(error));
      setEnding("confirm");
    }
  }

  let body;
  if (activity.loading && !state) {
    body = (
      <div aria-busy="true" aria-label="Loading activity" className="mt-5">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="mt-5 h-10 w-32" />
        <Skeleton className="mt-8 h-3 w-full" />
        <Skeleton className="mt-5 h-3 w-full" />
        <Skeleton className="mt-5 h-3 w-full" />
      </div>
    );
  } else if (!state && activity.error) {
    body = (
      <div className="mt-5 max-w-md">
        <Notice tone="danger">Couldn&apos;t load the activity. {activity.error.message}</Notice>
        <Button variant="secondary" className="mt-4" onClick={activity.refetch}>
          Try again
        </Button>
      </div>
    );
  } else if (!state) {
    body = (
      <div className="flex flex-col items-center px-4 py-10 text-center">
        <div className="flex size-11 items-center justify-center rounded-full bg-surface-2">
          <Radio className="size-5 text-text-subtle" strokeWidth={1.75} aria-hidden />
        </div>
        <p className="mt-4 text-body-lg text-text">Nothing running yet</p>
        <p className="mt-1 max-w-prose text-body text-text-muted">
          Ask a quick question or run one of your quizzes. Results come in live.
        </p>
      </div>
    );
  } else {
    body = (
      <div className="mt-5">
        {studentPaced ? (
          <QuestionPicker state={state} selectedIndex={selectedIndex} onSelect={onSelect} />
        ) : (
          isQuiz && <QuizNavigation activity={activity} state={state} />
        )}
        <ActivityResults
          state={state}
          selectedIndex={selectedIndex}
          hideResults={state.activity.hide_results}
        />
      </div>
    );
  }

  return (
    <section
      aria-labelledby="activity-heading"
      className="rounded-lg border border-border bg-surface p-5 sm:p-6 lg:col-span-2"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <h2 id="activity-heading" className="min-w-0 text-h3 font-semibold break-words text-text">
            {!state ? "Activity" : isQuiz ? state.activity.quiz_title || "Quiz" : "Quick question"}
          </h2>
          {question && (
            <span className="text-body text-text-muted">{TYPE_LABELS[question.type]}</span>
          )}
          {state && !live && <Badge>Ended</Badge>}
        </div>
        <div className="flex flex-wrap gap-2">
          {state && !live && (
            <ButtonLink href={`/teacher/reports/${state.activity.id}`} variant="ghost">
              <ClipboardList className="size-4" strokeWidth={1.75} aria-hidden />
              View report
            </ButtonLink>
          )}
          {canVote && (
            <Button
              variant="secondary"
              onClick={() => setVoting(true)}
              disabled={distinctAnswers < 2}
              title={distinctAnswers < 2 ? "A vote needs at least 2 different answers" : undefined}
            >
              <SquareCheckBig className="size-4" strokeWidth={1.75} aria-hidden />
              Start vote
            </Button>
          )}
          {live && (
            <Button variant="secondary" onClick={() => setEnding("confirm")}>
              <Square className="size-4" strokeWidth={1.75} aria-hidden />
              End activity
            </Button>
          )}
          <Button variant="secondary" onClick={() => setStarting("quick")}>
            <Zap className="size-4" strokeWidth={1.75} aria-hidden />
            Quick question
          </Button>
          <Button variant={live ? "secondary" : "primary"} onClick={() => setStarting("quiz")}>
            <ListChecks className="size-4" strokeWidth={1.75} aria-hidden />
            Start quiz
          </Button>
        </div>
      </div>

      {body}

      {starting === "quick" && (
        <QuickQuestionDialog
          roomId={roomId}
          liveActivityId={live?.id ?? null}
          onStarted={started}
          onClose={() => setStarting(null)}
        />
      )}
      {starting === "quiz" && (
        <StartQuizDialog
          roomId={roomId}
          liveActivityId={live?.id ?? null}
          onStarted={started}
          onClose={() => setStarting(null)}
        />
      )}

      {voting && live && (
        <StartVoteDialog
          roomId={roomId}
          activityId={live.id}
          optionCount={distinctAnswers}
          onStarted={(next) => {
            activity.replace(next);
            setVoting(false);
          }}
          onGone={() => {
            activity.refetch();
            setVoting(false);
          }}
          onClose={() => setVoting(false)}
        />
      )}

      {ending && (
        <Dialog
          title="End this activity?"
          description="Students won't be able to change their answers."
          onClose={() => setEnding(null)}
          busy={ending === "pending"}
        >
          {endError && <Notice tone="danger">{endError}</Notice>}
          <DialogActions>
            <Button
              variant="secondary"
              onClick={() => setEnding(null)}
              disabled={ending === "pending"}
            >
              Keep it running
            </Button>
            <Button variant="danger" onClick={() => void end()} disabled={ending === "pending"}>
              {ending === "pending" ? "Ending…" : "End activity"}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </section>
  );
}

/**
 * Confirms Start Vote (PRD QQ4): ends the short answer question, locking its answers, and
 * starts a quick MC question whose options are its distinct answers, in submission order.
 */
function StartVoteDialog({
  roomId,
  activityId,
  optionCount,
  onStarted,
  onGone,
  onClose,
}: {
  roomId: number;
  activityId: number;
  /** Distinct answers so far: the vote's options. More may arrive before it starts. */
  optionCount: number;
  onStarted: (state: TeacherState) => void;
  /** The question ended (or went) meanwhile and no vote started: show what's there. */
  onGone: () => void;
  onClose: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setPending(true);
    setError(null);
    try {
      onStarted(await activitiesApi.vote(activityId));
      return;
    } catch (err) {
      const lost = err instanceof ApiError && err.code === "network_error";
      const ended = err instanceof ApiError && err.code === "activity_ended";
      if (lost || ended) {
        // The vote may have started (a lost response, or another tab): switch to it
        // rather than offering a retry.
        const started = await findStartedActivity(roomId, activityId);
        if (started) {
          onStarted(started);
          return;
        }
      }
      if (ended || (err instanceof ApiError && err.status === 404)) {
        onGone();
        return;
      }
      setError(
        err instanceof ApiError && err.code === "not_enough_answers"
          ? "A vote needs at least 2 different answers. The question is still running."
          : errorMessage(err),
      );
      setPending(false);
    }
  }

  return (
    <Dialog
      title="End the question and start a vote?"
      description={`The ${optionCount} different answers become the choices, and students vote on the one they think is best. Their short answers are locked and kept in this question's report.`}
      onClose={onClose}
      busy={pending}
    >
      {error && <Notice tone="danger">{error}</Notice>}
      <DialogActions>
        <Button variant="secondary" onClick={onClose} disabled={pending}>
          Keep collecting
        </Button>
        <Button onClick={() => void start()} disabled={pending}>
          {pending ? "Starting vote…" : "Start vote"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** Above this many questions, the progress segments get too thin to read. */
const MAX_SEGMENTS = 20;

/**
 * "Question 3 of 10" with Previous / Next (PRD A1). Moving on locks the answers to the
 * question being left. The target is always computed from the question on screen, so a
 * double click or a retry can't skip one (navigating is idempotent per index).
 */
function QuizNavigation({
  activity,
  state,
}: {
  activity: ActivityState<TeacherState>;
  state: TeacherState;
}) {
  const [pending, setPending] = useState<"previous" | "next" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { id, status, mode, current_index: index } = state.activity;
  const total = state.questions.length;
  const canNavigate = status === "LIVE" && mode === "TEACHER_PACED";

  async function go(direction: "previous" | "next") {
    const target = direction === "next" ? index + 1 : index - 1;
    if (target < 0 || target >= total) return;
    setPending(direction);
    setError(null);
    try {
      activity.replace(await activitiesApi.navigate(id, target));
    } catch (err) {
      // Ended or gone meanwhile: the screen is out of date, so show what's really there.
      if (err instanceof ApiError && (err.status === 409 || err.status === 404)) {
        activity.refetch();
      } else {
        setError(errorMessage(err));
      }
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="mb-5 border-b border-border pb-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p aria-live="polite" className="text-body-lg text-text-muted">
          Question{" "}
          <span className="font-mono font-semibold text-text tabular-nums">{index + 1}</span> of{" "}
          <span className="font-mono tabular-nums">{total}</span>
        </p>
        {canNavigate && (
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => void go("previous")}
              disabled={pending !== null || index === 0}
            >
              <ChevronLeft className="size-4" strokeWidth={1.75} aria-hidden />
              {pending === "previous" ? "Going back…" : "Previous"}
            </Button>
            <Button
              onClick={() => void go("next")}
              disabled={pending !== null || index >= total - 1}
            >
              {pending === "next" ? "Moving on…" : "Next"}
              <ChevronRight className="size-4" strokeWidth={1.75} aria-hidden />
            </Button>
          </div>
        )}
      </div>
      {/* One segment per question while they're wide enough to read; then a plain bar. */}
      {total <= MAX_SEGMENTS ? (
        <div aria-hidden className="mt-3 flex gap-1">
          {state.questions.map((q, i) => (
            <span
              key={q.id}
              className={
                "h-1 flex-1 rounded-full transition-colors duration-220 ease-brand " +
                (i <= index ? "bg-accent" : "bg-surface-2")
              }
            />
          ))}
        </div>
      ) : (
        <div aria-hidden className="mt-3 h-1 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-accent transition-transform duration-220 ease-brand motion-reduce:transition-none"
            style={{ transform: `translateX(${((index + 1) / total) * 100 - 100}%)` }}
          />
        </div>
      )}
      {canNavigate && total > 1 && index === total - 1 && (
        <p className="mt-3 text-body text-text-muted">
          Last question. End the activity when everyone has answered.
        </p>
      )}
      {error && (
        <Notice tone="danger" className="mt-3">
          Couldn&apos;t change the question. {error}
        </Notice>
      )}
    </div>
  );
}

const promptPreview = (prompt: string) =>
  !prompt ? "Asked out loud" : prompt.length > 60 ? `${prompt.slice(0, 59).trimEnd()}…` : prompt;

/**
 * Student-paced (PRD L2): there's no current question, so the teacher picks which one the
 * chart shows. Only changes this screen; students aren't moved.
 */
function QuestionPicker({
  state,
  selectedIndex,
  onSelect,
}: {
  state: TeacherState;
  selectedIndex: number;
  onSelect: (index: number) => void;
}) {
  const selectId = useId();
  const { questions, participants, activity } = state;
  const total = questions.length;
  const finished = participants.filter((p) => p.finished_at !== null).length;

  return (
    <div className="mb-5 border-b border-border pb-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-1 basis-64">
          <label htmlFor={selectId} className="text-label font-medium text-text-muted">
            Results for
          </label>
          <select
            id={selectId}
            value={selectedIndex}
            onChange={(event) => onSelect(Number(event.target.value))}
            className={
              "mt-1.5 block h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-body " +
              "text-text transition-colors duration-150 ease-brand hover:border-text-subtle"
            }
          >
            {questions.map((question, index) => (
              <option key={question.id} value={index}>
                {index + 1}. {promptPreview(question.prompt)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => onSelect(selectedIndex - 1)}
            disabled={selectedIndex === 0}
            aria-label="Previous question"
          >
            <ChevronLeft className="size-4" strokeWidth={1.75} aria-hidden />
          </Button>
          <Button
            variant="secondary"
            onClick={() => onSelect(selectedIndex + 1)}
            disabled={selectedIndex >= total - 1}
            aria-label="Next question"
          >
            <ChevronRight className="size-4" strokeWidth={1.75} aria-hidden />
          </Button>
        </div>
      </div>
      <p aria-live="polite" className="mt-3 text-body text-text-muted">
        {activity.status === "LIVE" ? "Students work at their own pace. " : ""}
        <span className="font-medium text-text tabular-nums">{finished}</span> of{" "}
        <span className="tabular-nums">{participants.length}</span> finished.
      </p>
    </div>
  );
}

/** How many students are in the current (or last) activity (PRD L1). */
export function StudentsCard({ state }: { state: TeacherState | null }) {
  const live = state?.activity.status === "LIVE";
  return (
    <section
      aria-labelledby="students-heading"
      className="rounded-lg border border-border bg-surface p-5 sm:p-6"
    >
      <div className="flex items-center gap-2">
        <Users className="size-4 text-text-subtle" strokeWidth={1.75} aria-hidden />
        <h2 id="students-heading" className="text-body font-medium text-text-muted">
          Students joined
        </h2>
      </div>
      {state ? (
        <p
          aria-live="polite"
          className="mt-3 font-mono text-display font-semibold text-text tabular-nums"
        >
          {state.participant_count}
        </p>
      ) : (
        <p className="mt-3 font-mono text-display font-semibold text-text-subtle tabular-nums">
          <span aria-hidden>–</span>
          <span className="sr-only">None yet</span>
        </p>
      )}
      <p className="mt-2 text-body text-text-muted">
        {!state
          ? "Students appear here once they join an activity."
          : live
            ? "In this activity. Students who join later count too."
            : "Joined the last activity."}
      </p>
    </section>
  );
}
