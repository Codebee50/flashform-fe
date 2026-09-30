"use client";

import { ArrowLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { describeActivity } from "@/components/rooms/room-status";
import { Button, ButtonLink } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { roomsApi } from "@/lib/rooms-api";
import type { Report } from "@/lib/types";
import {
  DeleteReportDialog,
  EmptyReports,
  ReportListSkeleton,
  ReportRow,
  useReports,
} from "./report-list";

type RoomOption = { id: number; name: string };

/**
 * Every past activity, newest first (PRD RP1), overall or for one room. The room is in the
 * URL (`?room=<id>`) so the live room page can link straight to its reports.
 */
export function ReportsView({ roomId }: { roomId: number | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const selectId = useId();
  const { state, retry, removeLocally } = useReports();
  const [rooms, setRooms] = useState<RoomOption[] | null>(null);
  const [deleting, setDeleting] = useState<Report | null>(null);
  const [announcement, setAnnouncement] = useState("");

  // Every room for the filter, including ones with no reports yet. Without it, the filter
  // falls back to the rooms that appear in the reports.
  useEffect(() => {
    const controller = new AbortController();
    roomsApi.list({ signal: controller.signal }).then(
      (list) => setRooms(list.map(({ id, name }) => ({ id, name }))),
      () => {},
    );
    return () => controller.abort();
  }, []);

  const reports = state.status === "ready" ? state.reports : null;
  const options = sortByName(rooms ?? roomsIn(reports ?? []));
  const selectedRoom = roomId === null ? null : options.find((room) => room.id === roomId);
  const shown = reports && roomId !== null ? reports.filter((r) => r.room.id === roomId) : reports;

  function pickRoom(value: string) {
    router.replace(value ? `${pathname}?room=${value}` : pathname, { scroll: false });
  }

  return (
    <div className="mx-auto max-w-page px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      <ButtonLink href="/teacher" variant="ghost" className="-ml-3">
        <ArrowLeft className="size-4" strokeWidth={1.75} aria-hidden />
        Dashboard
      </ButtonLink>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-h1 font-semibold text-text">
            Reports{" "}
            {shown && shown.length > 0 && (
              <span className="ml-1 font-mono text-h2 font-normal text-text-subtle tabular-nums">
                {shown.length}
              </span>
            )}
          </h1>
          <p className="mt-1 text-body text-text-muted">
            Results from activities that have ended, newest first.
          </p>
        </div>
        {options.length > 1 || roomId !== null ? (
          <div className="w-full sm:w-64">
            <label htmlFor={selectId} className="text-label font-medium text-text-muted">
              Room
            </label>
            <select
              id={selectId}
              value={roomId === null ? "" : String(roomId)}
              onChange={(event) => pickRoom(event.target.value)}
              className={
                "mt-1.5 block h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-body " +
                "text-text transition-colors duration-150 ease-brand hover:border-text-subtle"
              }
            >
              <option value="">All rooms</option>
              {options.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
              {/* A room we don't know (deleted, or not loaded): keep the select truthful. */}
              {roomId !== null && !selectedRoom && (
                <option value={roomId}>{rooms ? "Unknown room" : "Loading…"}</option>
              )}
            </select>
          </div>
        ) : null}
      </div>

      <div className="mt-6">
        {state.status === "loading" && <ReportListSkeleton />}

        {state.status === "error" && (
          <div className="max-w-md">
            <Notice tone="danger">Couldn&apos;t load your reports. {state.message}</Notice>
            <Button variant="secondary" className="mt-4" onClick={retry}>
              Try again
            </Button>
          </div>
        )}

        {shown && shown.length === 0 && (
          <EmptyReports
            message={
              roomId === null
                ? "No reports yet. When an activity ends, its results are saved here."
                : `No reports for ${selectedRoom?.name ?? "this room"} yet. When an activity there ends, its results are saved here.`
            }
          />
        )}

        {shown && shown.length > 0 && (
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
            {shown.map((report) => (
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
    </div>
  );
}

function roomsIn(reports: Report[]): RoomOption[] {
  const byId = new Map<number, RoomOption>();
  for (const { room } of reports) byId.set(room.id, { id: room.id, name: room.name });
  return [...byId.values()];
}

const collator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });

function sortByName(rooms: RoomOption[]): RoomOption[] {
  return [...rooms].sort((a, b) => collator.compare(a.name, b.name));
}
