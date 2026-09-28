"use client";

import { DoorOpen, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { RoomCode } from "@/components/rooms/room-code";
import {
  CreateRoomDialog,
  DeleteRoomDialog,
  RenameRoomDialog,
} from "@/components/rooms/room-dialogs";
import { describeActivity, RoomStatus } from "@/components/rooms/room-status";
import { QuizzesSection } from "@/components/quizzes/quizzes-section";
import { Button, IconButton } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage } from "@/lib/api";
import { roomsApi } from "@/lib/rooms-api";
import type { Room } from "@/lib/types";

type RoomsState =
  { status: "loading" } | { status: "ready"; rooms: Room[] } | { status: "error"; message: string };

type OpenDialog =
  { kind: "create" } | { kind: "rename"; room: Room } | { kind: "delete"; room: Room } | null;

const createdDate = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

/** The teacher's home (PRD §10): rooms and quizzes. Reports come later. */
export function Dashboard() {
  return (
    <div className="mx-auto max-w-page space-y-12 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <h1 className="sr-only">Dashboard</h1>
      <RoomsSection />
      <QuizzesSection />
    </div>
  );
}

function RoomsSection() {
  const [state, setState] = useState<RoomsState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [dialog, setDialog] = useState<OpenDialog>(null);

  useEffect(() => {
    const controller = new AbortController();
    roomsApi.list({ signal: controller.signal }).then(
      (rooms) => setState({ status: "ready", rooms }),
      (error: unknown) => {
        if (!controller.signal.aborted) setState({ status: "error", message: errorMessage(error) });
      },
    );
    return () => controller.abort();
  }, [attempt]);

  const rooms = state.status === "ready" ? state.rooms : null;
  const close = () => setDialog(null);

  function update(change: (rooms: Room[]) => Room[]) {
    setState((current) =>
      current.status === "ready" ? { status: "ready", rooms: change(current.rooms) } : current,
    );
    close();
  }

  return (
    <>
      <section aria-labelledby="rooms-heading">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="rooms-heading" className="text-h2 font-semibold text-text">
              Rooms{" "}
              {rooms && rooms.length > 0 && (
                <span className="ml-1 font-mono text-h3 font-normal text-text-subtle tabular-nums">
                  {rooms.length}
                </span>
              )}
            </h2>
            <p className="mt-1 text-body text-text-muted">
              One room per class. Students join with the room&apos;s code.
            </p>
          </div>
          {rooms && rooms.length > 0 && (
            <Button onClick={() => setDialog({ kind: "create" })} className="shrink-0">
              <Plus className="size-4" strokeWidth={1.75} aria-hidden />
              New room
            </Button>
          )}
        </div>

        <div className="mt-6">
          {state.status === "loading" && <RoomListSkeleton />}

          {state.status === "error" && (
            <div className="max-w-md">
              <Notice tone="danger">Couldn&apos;t load your rooms. {state.message}</Notice>
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
          )}

          {rooms && rooms.length === 0 && (
            <EmptyRooms onCreate={() => setDialog({ kind: "create" })} />
          )}

          {rooms && rooms.length > 0 && (
            <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
              {rooms.map((room) => (
                <RoomRow
                  key={room.id}
                  room={room}
                  onRename={() => setDialog({ kind: "rename", room })}
                  onDelete={() => setDialog({ kind: "delete", room })}
                />
              ))}
            </ul>
          )}
        </div>
      </section>

      {dialog?.kind === "create" && (
        <CreateRoomDialog
          onClose={close}
          onCreated={(room) => update((rooms) => [room, ...rooms])}
        />
      )}
      {dialog?.kind === "rename" && (
        <RenameRoomDialog
          room={dialog.room}
          onClose={close}
          onRenamed={(room) => update((rooms) => rooms.map((r) => (r.id === room.id ? room : r)))}
        />
      )}
      {dialog?.kind === "delete" && (
        <DeleteRoomDialog
          room={dialog.room}
          onClose={close}
          onDeleted={(id) => update((rooms) => rooms.filter((r) => r.id !== id))}
        />
      )}
    </>
  );
}

function RoomRow({
  room,
  onRename,
  onDelete,
}: {
  room: Room;
  onRename: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="relative flex items-center gap-3 px-4 py-3.5 transition-colors duration-150 ease-brand hover:bg-surface-2 sm:gap-6 sm:px-5">
      <div className="min-w-0 flex-1 sm:flex sm:items-center sm:gap-6">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            {/* The link covers the whole row; the buttons sit above it. */}
            <Link
              href={`/teacher/rooms/${room.id}`}
              className="truncate rounded-sm text-body-lg font-medium text-text after:absolute after:inset-0"
            >
              {room.name}
            </Link>
            <RoomStatus room={room} />
          </div>
          <p className="mt-0.5 truncate text-caption text-text-subtle">
            {room.live_activity
              ? `Running: ${describeActivity(room.live_activity)}`
              : `Created ${createdDate.format(new Date(room.created_at))}`}
          </p>
        </div>
        <RoomCode
          code={room.code}
          className="mt-1.5 text-body-lg font-semibold text-text-muted sm:mt-0 sm:w-44 sm:text-h3 sm:text-text"
        />
      </div>
      <div className="relative flex shrink-0 items-center gap-1">
        <IconButton label={`Rename ${room.name}`} onClick={onRename}>
          <Pencil className="size-4" strokeWidth={1.75} aria-hidden />
        </IconButton>
        <IconButton label={`Delete ${room.name}`} onClick={onDelete} className="hover:text-danger">
          <Trash2 className="size-4" strokeWidth={1.75} aria-hidden />
        </IconButton>
      </div>
    </li>
  );
}

function RoomListSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading rooms"
      className="divide-y divide-border rounded-lg border border-border bg-surface"
    >
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex items-center gap-6 px-4 py-4 sm:px-5">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48 max-w-full" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="hidden h-6 w-28 sm:block" />
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  );
}

function EmptyRooms({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed border-border-strong bg-surface px-6 py-14 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-surface-2">
        <DoorOpen className="size-5 text-text-subtle" strokeWidth={1.75} aria-hidden />
      </div>
      <p className="mt-4 max-w-prose text-body-lg text-text-muted">
        No rooms yet. Create one for each class you teach.
      </p>
      <Button onClick={onCreate} className="mt-5">
        <Plus className="size-4" strokeWidth={1.75} aria-hidden />
        New room
      </Button>
    </div>
  );
}
