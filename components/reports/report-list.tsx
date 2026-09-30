"use client";

import { ClipboardList, ListChecks, Trash2, Zap } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { describeActivity } from "@/components/rooms/room-status";
import { Button, IconButton } from "@/components/ui/button";
import { Dialog, DialogActions } from "@/components/ui/dialog";
import { Notice } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, errorMessage } from "@/lib/api";
import { reportsApi } from "@/lib/reports-api";
import type { ActivityMode, Report } from "@/lib/types";

export const reportDate = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

const decimal = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });

const MODE_LABELS: Record<ActivityMode, string> = {
  TEACHER_PACED: "Teacher-paced quiz",
  STUDENT_PACED: "Student-paced quiz",
};

/** "Student-paced quiz", or null for a quick question (its title already says so). */
export function describeMode(activity: { type: Report["type"]; mode: ActivityMode }) {
  return activity.type === "QUIZ" ? MODE_LABELS[activity.mode] : null;
}

/** "72.5%" and "7.3/10", or null when there's nothing to average (PRD §17). */
export function formatAverage(
  avgScore: number | null,
  avgPercent: number | null,
  totalPossible: number,
) {
  if (avgScore === null || avgPercent === null || totalPossible === 0) return null;
  return {
    percent: `${decimal.format(avgPercent)}%`,
    score: `${decimal.format(avgScore)}/${totalPossible}`,
  };
}

type ReportsState =
  | { status: "loading" }
  | { status: "ready"; reports: Report[] }
  | { status: "error"; message: string };

/** The teacher's reports, newest first, with a retry and local removal after a delete. */
export function useReports() {
  const [state, setState] = useState<ReportsState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    reportsApi.list({ signal: controller.signal }).then(
      (reports) => setState({ status: "ready", reports }),
      (error: unknown) => {
        if (!controller.signal.aborted) setState({ status: "error", message: errorMessage(error) });
      },
    );
    return () => controller.abort();
  }, [attempt]);

  const retry = useCallback(() => {
    setState({ status: "loading" });
    setAttempt((n) => n + 1);
  }, []);

  const removeLocally = useCallback((id: number) => {
    setState((current) =>
      current.status === "ready"
        ? { status: "ready", reports: current.reports.filter((r) => r.id !== id) }
        : current,
    );
  }, []);

  return { state, retry, removeLocally };
}

/** One past activity (PRD RP1): what ran, where and when, how many joined, how they did. */
export function ReportRow({ report, onDelete }: { report: Report; onDelete?: () => void }) {
  const title = describeActivity(report);
  const mode = describeMode(report);
  const average = formatAverage(report.avg_score, report.avg_percent, report.total_possible);
  const TypeIcon = report.type === "QUIZ" ? ListChecks : Zap;

  return (
    <li className="relative flex items-center gap-3 px-4 py-3.5 transition-colors duration-150 ease-brand hover:bg-surface-2 sm:gap-4 sm:px-5">
      <div
        aria-hidden
        className="hidden size-9 shrink-0 items-center justify-center rounded-md bg-surface-2 text-text-subtle sm:flex"
      >
        <TypeIcon className="size-4" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1 sm:flex sm:items-center sm:gap-6">
        <div className="min-w-0 flex-1">
          {/* The link covers the whole row; the delete button sits above it. */}
          <Link
            href={`/teacher/reports/${report.id}`}
            className="block truncate rounded-sm text-body-lg font-medium text-text after:absolute after:inset-0"
          >
            {title}
          </Link>
          <p className="mt-0.5 truncate text-caption text-text-subtle">
            {report.room.name} · {reportDate.format(new Date(report.started_at))}
            {mode && ` · ${mode}`}
          </p>
        </div>
        <dl className="mt-1.5 flex gap-5 sm:mt-0 sm:gap-6">
          <div className="flex items-baseline gap-1.5 sm:w-20 sm:flex-col sm:items-end sm:gap-0.5">
            <dt className="text-caption text-text-subtle">Students</dt>
            <dd className="font-mono text-body font-medium text-text tabular-nums sm:text-body-lg">
              {report.participant_count}
            </dd>
          </div>
          <div className="flex items-baseline gap-1.5 sm:w-32 sm:flex-col sm:items-end sm:gap-0.5">
            <dt className="text-caption text-text-subtle">Avg score</dt>
            <dd className="font-mono text-body font-medium text-text tabular-nums sm:text-body-lg">
              {average ? (
                <>
                  {average.percent}{" "}
                  <span className="ml-1 text-caption font-normal text-text-subtle">
                    {average.score}
                  </span>
                </>
              ) : (
                <>
                  <span aria-hidden className="text-text-subtle">
                    —
                  </span>
                  <span className="sr-only">None</span>
                </>
              )}
            </dd>
          </div>
        </dl>
      </div>
      {onDelete && (
        <div className="relative shrink-0">
          <IconButton
            label={`Delete the report for ${title}, ${reportDate.format(new Date(report.started_at))}`}
            onClick={onDelete}
            className="hover:text-danger"
          >
            <Trash2 className="size-4" strokeWidth={1.75} aria-hidden />
          </IconButton>
        </div>
      )}
    </li>
  );
}

export function ReportListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div
      aria-busy="true"
      aria-label="Loading reports"
      className="divide-y divide-border rounded-lg border border-border bg-surface"
    >
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="flex items-center gap-4 px-4 py-4 sm:px-5">
          <Skeleton className="hidden size-9 sm:block" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-52 max-w-full" />
            <Skeleton className="h-3 w-64 max-w-full" />
          </div>
          <Skeleton className="hidden h-8 w-16 sm:block" />
          <Skeleton className="hidden h-8 w-20 sm:block" />
        </div>
      ))}
    </div>
  );
}

export function EmptyReports({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed border-border-strong bg-surface px-6 py-12 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-surface-2">
        <ClipboardList className="size-5 text-text-subtle" strokeWidth={1.75} aria-hidden />
      </div>
      <p className="mt-4 max-w-prose text-body-lg text-text-muted">{message}</p>
    </div>
  );
}

/** Confirms, then deletes a report (PRD RP4). It can't be undone. */
export function DeleteReportDialog({
  report,
  onDeleted,
  onClose,
}: {
  report: { id: number; title: string; startedAt: string };
  onDeleted: (id: number) => void;
  onClose: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setPending(true);
    setError(null);
    try {
      await reportsApi.remove(report.id);
      onDeleted(report.id);
    } catch (err) {
      // 404: already gone (deleted in another tab, or an earlier attempt went through).
      if (err instanceof ApiError && err.status === 404) {
        onDeleted(report.id);
        return;
      }
      setError(
        err instanceof ApiError && err.code === "activity_live"
          ? "This activity is still running. End it from the room page first."
          : errorMessage(err),
      );
      setPending(false);
    }
  }

  return (
    <Dialog
      title="Delete this report?"
      description={
        <>
          {report.title}, {reportDate.format(new Date(report.startedAt))}. This deletes the
          results and every student&apos;s answers. It can&apos;t be undone.
        </>
      }
      onClose={onClose}
      busy={pending}
    >
      {error && <Notice tone="danger">{error}</Notice>}
      <DialogActions>
        <Button variant="secondary" onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <Button variant="danger" onClick={() => void remove()} disabled={pending}>
          {pending ? "Deleting…" : "Delete report"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
