"use client";

import { ArrowLeft, Lock, LockOpen } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { RoomCode } from "@/components/rooms/room-code";
import { RoomStatus } from "@/components/rooms/room-status";
import { Button, ButtonLink } from "@/components/ui/button";
import { ConnectionIndicator } from "@/components/ui/connection-indicator";
import { CopyButton } from "@/components/ui/copy-button";
import { Notice } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/skeleton";
import { activitiesApi } from "@/lib/activities-api";
import { ApiError, errorMessage } from "@/lib/api";
import { joinPath } from "@/lib/room-code";
import { roomsApi } from "@/lib/rooms-api";
import type { LiveActivitySummary, Room } from "@/lib/types";
import { useActivityState } from "@/lib/use-activity-state";
import { useOrigin } from "@/lib/use-origin";
import { useTeacherRoomSocket } from "@/lib/use-room-socket";
import { ActivityPanel, StudentsCard } from "./activity-panel";

/** PRD §9: while an activity is live, also refetch on a timer, in case an event is lost. */
const LIVE_REFRESH_MS = 2_000;

type RoomState =
  | { status: "loading" }
  | { status: "ready"; room: Room }
  | { status: "not_found" }
  | { status: "error"; message: string };

const pageClass = "mx-auto max-w-page px-4 py-6 sm:px-6 sm:py-8 lg:px-8";

/**
 * The live room page (PRD L1, L2, §10): the code to project, the join link and the lock,
 * the student count, and the running activity with its live results.
 */
export function RoomView({ id }: { id: string }) {
  const roomId = /^\d+$/.test(id) ? Number(id) : null;
  const [state, setState] = useState<RoomState>(
    roomId === null ? { status: "not_found" } : { status: "loading" },
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (roomId === null) return;
    const controller = new AbortController();
    roomsApi.get(roomId, { signal: controller.signal }).then(
      (room) => setState({ status: "ready", room }),
      (error: unknown) => {
        if (controller.signal.aborted) return;
        setState(
          error instanceof ApiError && error.status === 404
            ? { status: "not_found" }
            : { status: "error", message: errorMessage(error) },
        );
      },
    );
    return () => controller.abort();
  }, [roomId, attempt]);

  if (state.status === "loading") return <RoomSkeleton />;

  if (state.status === "not_found") {
    return (
      <div className={pageClass}>
        <BackLink />
        <div className="mt-6 max-w-md">
          <h1 className="text-h2 font-semibold text-text">Room not found</h1>
          <p className="mt-2 text-body-lg text-text-muted">
            It may have been deleted, or the link is wrong.
          </p>
          <ButtonLink href="/teacher" variant="secondary" className="mt-5">
            Go to your rooms
          </ButtonLink>
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className={pageClass}>
        <BackLink />
        <div className="mt-6 max-w-md">
          <Notice tone="danger">Couldn&apos;t load this room. {state.message}</Notice>
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => {
              setState({ status: "loading" });
              setAttempt((n) => n + 1);
            }}
          >
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <LoadedRoom
      room={state.room}
      onChange={(room) => setState({ status: "ready", room })}
      onGone={() => setState({ status: "not_found" })}
    />
  );
}

function LoadedRoom({
  room,
  onChange,
  onGone,
}: {
  room: Room;
  onChange: (room: Room) => void;
  onGone: () => void;
}) {
  const origin = useOrigin();
  const [locking, setLocking] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);

  const activity = useActivityState(
    useCallback(
      (activityId: number | null, signal: AbortSignal) =>
        activityId === null
          ? Promise.resolve(null)
          : activitiesApi.teacherState(activityId, { signal }),
      [],
    ),
    { activityId: room.live_activity?.id ?? null },
  );
  const { status: connection } = useTeacherRoomSocket(room.id, {
    onEvent: activity.handleEvent,
    refetch: activity.refetch,
    onNotFound: onGone,
  });

  // The header's "Live" badge follows the activity on screen once it's loaded, so starting
  // and ending (here or in another tab) show without reloading the room.
  const shown = activity.state?.activity;
  const liveActivity: LiveActivitySummary | null = shown
    ? shown.status === "LIVE"
      ? {
          id: shown.id,
          type: shown.type,
          mode: shown.mode,
          quiz_title: shown.quiz_title,
          started_at: shown.started_at,
        }
      : null
    : room.live_activity;
  const isLive = liveActivity !== null;
  const { refetch } = activity;

  useEffect(() => {
    if (!isLive) return;
    const timer = window.setInterval(refetch, LIVE_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [isLive, refetch]);

  const path = joinPath(room.code);
  const joinUrl = origin ? `${origin}${path}` : null;
  const host = origin ? origin.replace(/^https?:\/\//, "") : null;

  async function toggleLock() {
    setLocking(true);
    setLockError(null);
    try {
      onChange(await roomsApi.update(room.id, { is_locked: !room.is_locked }));
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) onGone();
      else setLockError(errorMessage(error));
    } finally {
      setLocking(false);
    }
  }

  const LockIcon = room.is_locked ? LockOpen : Lock;
  const lockLabel = locking
    ? room.is_locked
      ? "Unlocking…"
      : "Locking…"
    : room.is_locked
      ? "Unlock room"
      : "Lock room";

  return (
    <div className={pageClass}>
      <BackLink />

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="min-w-0 text-h1 font-semibold break-words text-text">{room.name}</h1>
            <div className="flex items-center gap-2">
              <RoomStatus room={{ ...room, live_activity: liveActivity }} />
            </div>
          </div>
          <p className="mt-1 text-body text-text-muted">
            {room.is_locked
              ? "Locked. Students who already joined can keep answering; nobody new can join."
              : "Open. Anyone with the code can join."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <ConnectionIndicator status={connection} />
          <Button variant="secondary" onClick={() => void toggleLock()} disabled={locking}>
            <LockIcon className="size-4" strokeWidth={1.75} aria-hidden />
            {lockLabel}
          </Button>
        </div>
      </div>

      {lockError && (
        <Notice tone="danger" className="mt-4 max-w-md">
          {lockError}
        </Notice>
      )}

      {/* The part the class reads off the board. */}
      <section
        aria-label="How students join"
        className="mt-6 flex flex-col items-center rounded-lg border border-border bg-surface px-4 py-10 text-center sm:px-8 sm:py-14"
      >
        <p className="text-body-lg text-text-muted">
          {host ? (
            <>
              Go to <span className="font-medium text-text">{host}</span> and enter
            </>
          ) : (
            "Enter the room code"
          )}
        </p>
        <RoomCode
          code={room.code}
          className={
            "mt-3 font-semibold text-text sm:mt-4 " +
            (room.code.length > 6 ? "text-projector-long" : "text-projector")
          }
        />
        {host && (
          <p className="mt-5 text-body-lg break-all text-text-muted sm:mt-6">
            or open{" "}
            <span className="inline-block font-medium text-text">
              {host}
              {path}
            </span>
          </p>
        )}
        {room.is_locked && (
          <p className="mt-4 inline-flex items-center gap-1.5 text-body-lg font-medium text-warning">
            <Lock className="size-4" strokeWidth={2} aria-hidden />
            This room is locked. New students can&apos;t join.
          </p>
        )}
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <CopyButton value={room.code} label="Copy code" />
          {joinUrl && <CopyButton value={joinUrl} label="Copy link" />}
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <ActivityPanel roomId={room.id} activity={activity} />
        <StudentsCard state={activity.state} />
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <ButtonLink href="/teacher" variant="ghost" className="-ml-3">
      <ArrowLeft className="size-4" strokeWidth={1.75} aria-hidden />
      All rooms
    </ButtonLink>
  );
}

function RoomSkeleton() {
  return (
    <div className={pageClass} aria-busy="true" aria-label="Loading room">
      <BackLink />
      <Skeleton className="mt-6 h-9 w-72 max-w-full" />
      <Skeleton className="mt-3 h-4 w-56 max-w-full" />
      <div className="mt-8 flex flex-col items-center rounded-lg border border-border bg-surface px-4 py-14">
        <Skeleton className="h-5 w-64 max-w-full" />
        <Skeleton className="mt-5 h-28 w-full max-w-xl" />
        <Skeleton className="mt-6 h-5 w-56 max-w-full" />
      </div>
    </div>
  );
}
