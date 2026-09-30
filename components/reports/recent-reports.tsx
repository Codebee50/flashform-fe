"use client";

import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { describeActivity } from "@/components/rooms/room-status";
import type { Report } from "@/lib/types";
import {
  DeleteReportDialog,
  EmptyReports,
  ReportListSkeleton,
  ReportRow,
  useReports,
} from "./report-list";

/** How many reports the dashboard shows; the rest are on /teacher/reports. */
const RECENT = 5;

/** The dashboard's latest reports (PRD §10). */
export function RecentReports() {
  const { state, retry, removeLocally } = useReports();
  const [deleting, setDeleting] = useState<Report | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const reports = state.status === "ready" ? state.reports : null;

  return (
    <section aria-labelledby="reports-heading">
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 id="reports-heading" className="text-h2 font-semibold text-text">
            Recent reports
          </h2>
          <p className="mt-1 text-body text-text-muted">
            Results from activities that have ended, newest first.
          </p>
        </div>
        {reports && reports.length > 0 && (
          <ButtonLink href="/teacher/reports" variant="secondary" className="shrink-0">
            All reports
            <ArrowRight className="size-4" strokeWidth={1.75} aria-hidden />
          </ButtonLink>
        )}
      </div>

      <div className="mt-6">
        {state.status === "loading" && <ReportListSkeleton rows={2} />}

        {state.status === "error" && (
          <div className="max-w-md">
            <Notice tone="danger">Couldn&apos;t load your reports. {state.message}</Notice>
            <Button variant="secondary" className="mt-4" onClick={retry}>
              Try again
            </Button>
          </div>
        )}

        {reports && reports.length === 0 && (
          <EmptyReports message="No reports yet. When an activity ends, its results are saved here." />
        )}

        {reports && reports.length > 0 && (
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
            {reports.slice(0, RECENT).map((report) => (
              <ReportRow key={report.id} report={report} onDelete={() => setDeleting(report)} />
            ))}
          </ul>
        )}
      </div>

      {deleting && (
        <DeleteReportDialog
          report={{
            id: deleting.id,
            title: describeActivity(deleting),
            startedAt: deleting.started_at,
          }}
          onClose={() => setDeleting(null)}
          onDeleted={(id) => {
            removeLocally(id);
            setAnnouncement("Report deleted.");
            setDeleting(null);
          }}
        />
      )}
    </section>
  );
}
