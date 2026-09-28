"use client";

import { Radio, Square, Users, Zap } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogActions } from "@/components/ui/dialog";
import { Notice } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/skeleton";
import { activitiesApi } from "@/lib/activities-api";
import { ApiError, errorMessage } from "@/lib/api";
import type { QuestionType, TeacherState } from "@/lib/types";
import type { ActivityState } from "@/lib/use-activity-state";
import { ActivityResults, currentQuestion } from "./activity-results";
import { QuickQuestionDialog } from "./quick-question-dialog";

const TYPE_LABELS: Record<QuestionType, string> = {
  MC: "Multiple choice",
  TF: "True or false",
  SA: "Short answer",
};

/**
 * The room's activity (PRD QQ1–QQ3, QQ5, L2): start a quick question, watch the answers
 * come in, end it. After it ends, the final results stay until the next one starts.
 */
export function ActivityPanel({
  roomId,
  activity,
}: {
  roomId: number;
  activity: ActivityState<TeacherState>;
}) {
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState<"confirm" | "pending" | null>(null);
  const [endError, setEndError] = useState<string | null>(null);

  const { state } = activity;
  const live = state?.activity.status === "LIVE" ? state.activity : null;
  const question = state ? currentQuestion(state)?.question : null;

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
          Start a quick question to hear from everyone. Results come in live.
        </p>
      </div>
    );
  } else {
    body = (
      <div className="mt-5">
        <ActivityResults state={state} />
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
          <h2 id="activity-heading" className="text-h3 font-semibold text-text">
            {state?.activity.type === "QUICK" ? "Quick question" : "Activity"}
          </h2>
          {question && (
            <span className="text-body text-text-muted">{TYPE_LABELS[question.type]}</span>
          )}
          {state && !live && <Badge>Ended</Badge>}
        </div>
        <div className="flex flex-wrap gap-2">
          {live && (
            <Button variant="secondary" onClick={() => setEnding("confirm")}>
              <Square className="size-4" strokeWidth={1.75} aria-hidden />
              End activity
            </Button>
          )}
          <Button variant={live ? "secondary" : "primary"} onClick={() => setStarting(true)}>
            <Zap className="size-4" strokeWidth={1.75} aria-hidden />
            Quick question
          </Button>
        </div>
      </div>

      {body}

      {starting && (
        <QuickQuestionDialog
          roomId={roomId}
          liveActivityId={live?.id ?? null}
          onStarted={(started) => {
            activity.replace(started);
            setStarting(false);
          }}
          onClose={() => setStarting(false)}
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
