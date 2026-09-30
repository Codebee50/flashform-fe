"use client";

import { ArrowLeft, Download, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { describeActivity } from "@/components/rooms/room-status";
import { TYPE_LABELS } from "@/components/teacher/activity-panel";
import {
  ChoiceResults,
  percent,
  summaryFor,
  TextResults,
} from "@/components/teacher/activity-results";
import { StudentTable } from "@/components/teacher/student-table";
import { Button, ButtonLink } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/skeleton";
import { activitiesApi } from "@/lib/activities-api";
import { ApiError, errorMessage } from "@/lib/api";
import { reportsApi } from "@/lib/reports-api";
import { roomsApi } from "@/lib/rooms-api";
import type { Room, TeacherQuestion, TeacherState } from "@/lib/types";
import { DeleteReportDialog, describeMode, formatAverage, reportDate } from "./report-list";

type DetailState =
  | { status: "loading" }
  | { status: "ready"; state: TeacherState }
  | { status: "not_found" }
  | { status: "error"; message: string };

const pageClass = "mx-auto max-w-page px-4 py-6 sm:px-6 sm:py-8 lg:px-8";

/**
 * One past activity (PRD RP2–RP4): the final answers table with scores, a summary per
 * question, the CSV download and delete. The data is the activity's teacher state, the
 * same payload as the live view.
 */
export function ReportDetail({ id }: { id: string }) {
  const activityId = /^\d+$/.test(id) ? Number(id) : null;
  const [detail, setDetail] = useState<DetailState>(
    activityId === null ? { status: "not_found" } : { status: "loading" },
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (activityId === null) return;
    const controller = new AbortController();
    activitiesApi.teacherState(activityId, { signal: controller.signal }).then(
      (state) => setDetail({ status: "ready", state }),
      (error: unknown) => {
        if (controller.signal.aborted) return;
        setDetail(
          error instanceof ApiError && error.status === 404
            ? { status: "not_found" }
            : { status: "error", message: errorMessage(error) },
        );
      },
    );
    return () => controller.abort();
  }, [activityId, attempt]);

  if (detail.status === "loading") return <DetailSkeleton />;

  if (detail.status === "not_found") {
    return (
      <div className={pageClass}>
        <BackLink />
        <div className="mt-6 max-w-md">
          <h1 className="text-h2 font-semibold text-text">Report not found</h1>
          <p className="mt-2 text-body-lg text-text-muted">
            It may have been deleted, or the link is wrong.
          </p>
          <ButtonLink href="/teacher/reports" variant="secondary" className="mt-5">
            Go to your reports
          </ButtonLink>
        </div>
      </div>
    );
  }

  if (detail.status === "error") {
    return (
      <div className={pageClass}>
        <BackLink />
        <div className="mt-6 max-w-md">
          <Notice tone="danger">Couldn&apos;t load this report. {detail.message}</Notice>
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => {
              setDetail({ status: "loading" });
              setAttempt((n) => n + 1);
            }}
          >
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return <LoadedReport state={detail.state} onGone={() => setDetail({ status: "not_found" })} />;
}

function LoadedReport({ state, onGone }: { state: TeacherState; onGone: () => void }) {
  const router = useRouter();
  const { activity, participants, questions, total_possible: totalPossible } = state;
  const [room, setRoom] = useState<Room | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // The room's name and code aren't in the state. Nice to have, so failures are ignored.
  useEffect(() => {
    const controller = new AbortController();
    roomsApi.get(activity.room_id, { signal: controller.signal }).then(setRoom, () => {});
    return () => controller.abort();
  }, [activity.room_id]);

  const title = describeActivity(activity);
  const mode = describeMode(activity);
  const live = activity.status === "LIVE";
  const studentPaced = activity.type === "QUIZ" && activity.mode === "STUDENT_PACED";
  const average = averageOf(state);
  const duration = activity.ended_at ? ranFor(activity.started_at, activity.ended_at) : null;

  async function download() {
    setDownloading(true);
    setDownloadError(null);
    try {
      await reportsApi.downloadCsv({
        id: activity.id,
        roomCode: room?.code ?? null,
        startedAt: activity.started_at,
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) onGone();
      else setDownloadError(`Couldn't download the CSV. ${errorMessage(error)}`);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className={pageClass}>
      <BackLink />

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-h1 font-semibold break-words text-text">{title}</h1>
          <p className="mt-1 text-body text-text-muted">
            {room && (
              <>
                <Link
                  href={`/teacher/rooms/${room.id}`}
                  className="rounded-sm font-medium text-text underline decoration-border-strong underline-offset-4 transition-colors duration-150 ease-brand hover:decoration-text"
                >
                  {room.name}
                </Link>
                {" · "}
              </>
            )}
            <time dateTime={activity.started_at}>
              {reportDate.format(new Date(activity.started_at))}
            </time>
            {duration && (
              <>
                {" · "}
                <span className="whitespace-nowrap">ran {duration}</span>
              </>
            )}
            {mode && ` · ${mode}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => void download()}
            disabled={downloading}
            aria-busy={downloading || undefined}
          >
            <Download className="size-4" strokeWidth={1.75} aria-hidden />
            {downloading ? "Preparing CSV…" : "Download CSV"}
          </Button>
          <Button
            variant="secondary"
            onClick={() => setDeleting(true)}
            disabled={live}
            title={live ? "End the activity before deleting its report" : undefined}
            className="hover:text-danger"
          >
            <Trash2 className="size-4" strokeWidth={1.75} aria-hidden />
            Delete
          </Button>
        </div>
      </div>

      {downloadError && (
        <Notice tone="danger" className="mt-4 max-w-xl">
          {downloadError}
        </Notice>
      )}

      {live && (
        <Notice tone="warning" className="mt-4 max-w-xl">
          This activity is still running, so these are the answers so far.{" "}
          <Link
            href={`/teacher/rooms/${activity.room_id}`}
            className="font-medium underline underline-offset-4"
          >
            Open the live room
          </Link>
        </Notice>
      )}

      <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4">
        <Stat label="Students" value={String(participants.length)} />
        <Stat
          label="Average score"
          value={average?.percent ?? null}
          detail={
            average
              ? `${average.score} correct`
              : totalPossible === 0
                ? "No correct answers set"
                : "Nobody joined"
          }
        />
        <Stat label="Questions" value={String(questions.length)} />
        {studentPaced ? (
          <Stat
            label="Finished"
            value={String(participants.filter((p) => p.finished_at !== null).length)}
            detail={`of ${participants.length}`}
          />
        ) : (
          <Stat
            label="Graded questions"
            value={String(totalPossible)}
            detail="With a correct answer"
          />
        )}
      </dl>

      <StudentTable state={state} showScore />

      <section aria-labelledby="questions-heading" className="mt-10">
        <h2 id="questions-heading" className="text-h2 font-semibold text-text">
          {questions.length === 1 ? "Question" : "Questions"}
        </h2>
        <ol className="mt-4 grid gap-4 lg:grid-cols-2">
          {questions.map((question, index) => (
            <QuestionSummaryCard
              key={question.id}
              number={index + 1}
              question={question}
              state={state}
            />
          ))}
        </ol>
      </section>

      {deleting && (
        <DeleteReportDialog
          report={{ id: activity.id, title, startedAt: activity.started_at }}
          onClose={() => setDeleting(false)}
          onDeleted={() => router.replace("/teacher/reports")}
        />
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  detail,
}: {
  label: string;
  /** Null shows a dash: nothing to report. */
  value: string | null;
  detail?: string;
}) {
  return (
    <div className="bg-surface px-5 py-4">
      <dt className="text-caption text-text-subtle">{label}</dt>
      <dd className="mt-1">
        {value === null ? (
          <>
            <span aria-hidden className="font-mono text-h2 font-semibold text-text-subtle">
              —
            </span>
            <span className="sr-only">None</span>
          </>
        ) : (
          <span className="font-mono text-h2 font-semibold text-text tabular-nums">{value}</span>
        )}
        {detail && <span className="mt-0.5 block text-caption text-text-muted">{detail}</span>}
      </dd>
    </div>
  );
}

/** One question's final results (PRD RP2): how many answered, % correct, the spread. */
function QuestionSummaryCard({
  number,
  question,
  state,
}: {
  number: number;
  question: TeacherQuestion;
  state: TeacherState;
}) {
  const summary = summaryFor(state, question);
  const answered = summary.answered_count;
  const joined = state.participant_count;
  const graded = summary.correct_count !== null;

  return (
    <li className="rounded-lg border border-border bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-label font-medium text-text-subtle">
          Question {number} · {TYPE_LABELS[question.type]}
        </p>
        <p className="text-body text-text-muted">
          <span className="font-mono font-medium text-text tabular-nums">{answered}</span>
          <span className="font-mono tabular-nums">/{joined}</span> answered
          {graded && answered > 0 && (
            <>
              {" · "}
              <span className="font-mono font-medium text-text tabular-nums">
                {percent(summary.correct_count ?? 0, answered)}%
              </span>{" "}
              correct
            </>
          )}
        </p>
      </div>
      <h3
        className={
          "mt-2 text-body-lg font-medium break-words " +
          (question.prompt ? "text-text" : "text-text-muted")
        }
      >
        {question.prompt || "Asked out loud"}
      </h3>
      <div className="mt-5 border-t border-border pt-5">
        {question.type === "SA" ? (
          <TextResults summary={summary} emptyMessage="Nobody answered this question." />
        ) : (
          <ChoiceResults question={question} summary={summary} />
        )}
      </div>
    </li>
  );
}

/** The class average, worked out like the reports list's (PRD §17). */
function averageOf({ participants, total_possible: total }: TeacherState) {
  if (participants.length === 0 || total === 0) return null;
  const mean = participants.reduce((sum, p) => sum + p.score, 0) / participants.length;
  return formatAverage(
    Math.round(mean * 100) / 100,
    Math.round((mean / total) * 1000) / 10,
    total,
  );
}

/** "under a minute", "12 min", "1 h 5 min". */
function ranFor(start: string, end: string): string {
  const minutes = Math.round((Date.parse(end) - Date.parse(start)) / 60_000);
  if (minutes < 1) return "under a minute";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

function BackLink() {
  return (
    <ButtonLink href="/teacher/reports" variant="ghost" className="-ml-3">
      <ArrowLeft className="size-4" strokeWidth={1.75} aria-hidden />
      All reports
    </ButtonLink>
  );
}

function DetailSkeleton() {
  return (
    <div className={pageClass} aria-busy="true" aria-label="Loading report">
      <BackLink />
      <Skeleton className="mt-6 h-9 w-72 max-w-full" />
      <Skeleton className="mt-3 h-4 w-80 max-w-full" />
      <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4">
        {[0, 1, 2, 3].map((tile) => (
          <div key={tile} className="bg-surface px-5 py-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-2 h-7 w-14" />
          </div>
        ))}
      </div>
      <Skeleton className="mt-6 h-64 w-full rounded-lg" />
    </div>
  );
}
