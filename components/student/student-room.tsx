"use client";

import { Hourglass, Lock, LogOut, SearchX, WifiOff, CircleCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Dialog, DialogActions } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, errorMessage } from "@/lib/api";
import { normalizeRoomCode, ROOM_CODE_PATTERN } from "@/lib/room-code";
import { studentApi } from "@/lib/student-api";
import {
  readSession,
  updateSession,
  useStudentSession,
  writeSession,
  type StudentSession,
} from "@/lib/student-session";
import { loadStudentState } from "@/lib/student-state";
import type { PublicRoom, StudentEvent } from "@/lib/types";
import { useActivityState } from "@/lib/use-activity-state";
import { useStudentRoomSocket } from "@/lib/use-room-socket";
import { QuestionView } from "./question-view";
import { MessageScreen, StudentShell } from "./student-shell";

const NAME_MAX = 40;

type Lookup =
  | { status: "loading" }
  | { status: "ready"; room: PublicRoom }
  | { status: "not_found" }
  | { status: "error"; message: string };

const hasCode = (error: unknown, code: string) => error instanceof ApiError && error.code === code;

/**
 * The student app for one room (PRD §10 `/r/[code]`): name entry, then whatever the
 * activity calls for. A student with a saved session goes straight back in (PRD S3).
 */
export function StudentRoom({ code: raw }: { code: string }) {
  const router = useRouter();
  const code = normalizeRoomCode(decodeURIComponent(raw));
  const valid = ROOM_CODE_PATTERN.test(code);
  const session = useStudentSession(code);
  const [lookup, setLookup] = useState<Lookup>(
    valid ? { status: "loading" } : { status: "not_found" },
  );
  const [attempt, setAttempt] = useState(0);
  const [left, setLeft] = useState(false);

  useEffect(() => {
    if (!valid) return;
    const controller = new AbortController();
    studentApi.room(code, { signal: controller.signal }).then(
      (room) => setLookup({ status: "ready", room }),
      (error: unknown) => {
        if (controller.signal.aborted) return;
        setLookup(
          error instanceof ApiError && error.status === 404
            ? { status: "not_found" }
            : { status: "error", message: errorMessage(error) },
        );
      },
    );
    return () => controller.abort();
  }, [code, valid, attempt]);

  const retryLookup = () => {
    setLookup({ status: "loading" });
    setAttempt((n) => n + 1);
  };

  if (left) {
    return (
      <StudentShell code={code}>
        <MessageScreen icon={LogOut} title="You left the room" />
      </StudentShell>
    );
  }

  if (lookup.status === "not_found") {
    return (
      <StudentShell code={code}>
        <RoomNotFound code={code} />
      </StudentShell>
    );
  }

  // Already joined: go straight back in, even if the lookup is slow or failed.
  if (session) {
    return (
      <StudentActivity
        code={code}
        session={session}
        onLeft={() => {
          setLeft(true);
          writeSession(code, null);
          router.replace("/");
        }}
      />
    );
  }

  return (
    <StudentShell code={code}>
      {lookup.status === "loading" && <NameSkeleton />}
      {lookup.status === "error" && (
        <MessageScreen
          icon={WifiOff}
          title="Can't reach Flashform"
          action={
            <Button size="lg" variant="secondary" className="h-13 w-full" onClick={retryLookup}>
              Try again
            </Button>
          }
        >
          {lookup.message}
        </MessageScreen>
      )}
      {lookup.status === "ready" &&
        (lookup.room.is_locked ? (
          <RoomLocked onRetry={retryLookup} />
        ) : (
          <NameForm
            roomName={lookup.room.name}
            onSubmit={(name) =>
              writeSession(code, {
                roomCode: lookup.room.code,
                name,
                token: null,
                activityId: null,
                pending: null,
              })
            }
          />
        ))}
    </StudentShell>
  );
}

function StudentActivity({
  code,
  session,
  onLeft,
}: {
  code: string;
  session: StudentSession;
  onLeft: () => void;
}) {
  const activity = useActivityState(
    useCallback((_: number | null, signal: AbortSignal) => loadStudentState(code, signal), [code]),
  );
  const [gone, setGone] = useState(false);
  const [leaving, setLeaving] = useState<"confirm" | "pending" | null>(null);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  const { status } = useStudentRoomSocket(code, {
    token: session.token,
    refetch: activity.refetch,
    onNotFound: () => setGone(true),
    onTokenRejected: () => {
      const refused = session.token;
      updateSession(code, (s) => (s.token === refused ? { ...s, token: null } : s));
    },
    onEvent: (event: StudentEvent) => {
      if (event.type === "participant_removed") {
        // PRD L5: back to the join screen for this room, name and all.
        if (event.participant_id === activity.state?.participant.id) writeSession(code, null);
        return;
      }
      activity.handleEvent(event);
    },
  });

  async function leave() {
    setLeaving("pending");
    setLeaveError(null);
    const token = readSession(code)?.token;
    try {
      if (token) await studentApi.leave(token);
    } catch (error) {
      // 401: the token already stopped working, which is what leaving does anyway.
      if (!(error instanceof ApiError && error.status === 401)) {
        setLeaveError(errorMessage(error));
        setLeaving("confirm");
        return;
      }
    }
    onLeft();
  }

  const cause = activity.error?.cause;
  const state = activity.state;
  let body;
  if (gone || hasCode(cause, "room_not_found")) {
    body = <RoomNotFound code={code} />;
  } else if (hasCode(cause, "room_locked")) {
    body = <RoomLocked onRetry={activity.refetch} />;
  } else if (activity.loading) {
    body = <QuestionSkeleton />;
  } else if (!state && activity.error) {
    body = (
      <MessageScreen
        icon={WifiOff}
        title="Can't reach Flashform"
        action={
          <Button size="lg" variant="secondary" className="h-13 w-full" onClick={activity.refetch}>
            Try again
          </Button>
        }
      >
        {activity.error.message} We&apos;ll keep trying.
      </MessageScreen>
    );
  } else if (!state || (state.activity.status === "LIVE" && state.questions.length === 0)) {
    body = (
      <MessageScreen icon={Hourglass} title="You're in">
        Waiting for your teacher to start.
      </MessageScreen>
    );
  } else if (state.activity.status === "ENDED") {
    body = (
      <MessageScreen icon={CircleCheck} title="This activity has ended">
        Stay here for the next one. It opens on its own.
      </MessageScreen>
    );
  } else {
    const question = state.questions[0];
    body = (
      <QuestionView
        key={`${state.activity.id}:${question.id}`}
        code={code}
        activityId={state.activity.id}
        question={question}
        questionCount={state.question_count}
        onStale={activity.refetch}
      />
    );
  }

  return (
    <StudentShell
      code={code}
      status={gone ? undefined : status}
      footer={
        <>
          <p className="min-w-0 truncate text-body-lg text-text-muted">
            Joined as <span className="font-medium text-text">{session.name}</span>
          </p>
          <Button
            variant="ghost"
            className="-mr-3 h-11 shrink-0"
            onClick={() => setLeaving("confirm")}
          >
            Leave room
          </Button>
        </>
      }
    >
      {body}
      {leaving && (
        <Dialog
          title="Leave this room?"
          description="Your answers stay with your teacher. To come back, enter the code and your name again."
          onClose={() => setLeaving(null)}
          busy={leaving === "pending"}
        >
          {leaveError && <Notice tone="danger">{leaveError}</Notice>}
          <DialogActions>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setLeaving(null)}
              disabled={leaving === "pending"}
            >
              Stay
            </Button>
            <Button
              variant="danger"
              size="lg"
              onClick={() => void leave()}
              disabled={leaving === "pending"}
            >
              {leaving === "pending" ? "Leaving…" : "Leave room"}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </StudentShell>
  );
}

function NameForm({ roomName, onSubmit }: { roomName: string; onSubmit: (name: string) => void }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Enter your name so your teacher knows who answered.");
      return;
    }
    onSubmit(trimmed);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="motion-safe:animate-fade-in">
      <p className="text-body-lg text-text-muted">Joining {roomName}</p>
      <h1 className="mt-1 text-h2 font-semibold text-text">What should your teacher call you?</h1>
      <Field
        label="Your name"
        className="mt-6"
        inputClassName="h-13"
        name="name"
        value={name}
        onChange={(event) => {
          setName(event.target.value);
          if (error) setError(null);
        }}
        maxLength={NAME_MAX}
        autoComplete="nickname"
        autoCapitalize="words"
        enterKeyHint="go"
        error={error}
        autoFocus
      />
      <Button type="submit" size="lg" className="mt-5 h-13 w-full">
        Join room
      </Button>
    </form>
  );
}

function RoomNotFound({ code }: { code: string }) {
  return (
    <MessageScreen
      icon={SearchX}
      title="Room not found"
      action={
        <ButtonLink href="/" variant="secondary" size="lg" className="h-13 w-full">
          Enter another code
        </ButtonLink>
      }
    >
      We couldn&apos;t find room {code}. Check the code on the board.
    </MessageScreen>
  );
}

function RoomLocked({ onRetry }: { onRetry: () => void }) {
  return (
    <MessageScreen
      icon={Lock}
      title="This room is locked"
      action={
        <Button size="lg" variant="secondary" className="h-13 w-full" onClick={onRetry}>
          Try again
        </Button>
      }
    >
      Ask your teacher to unlock it.
    </MessageScreen>
  );
}

function NameSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading room">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="mt-3 h-8 w-full" />
      <Skeleton className="mt-8 h-13 w-full" />
      <Skeleton className="mt-5 h-13 w-full" />
    </div>
  );
}

function QuestionSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <Skeleton className="h-7 w-3/4" />
      <div className="mt-6 grid grid-cols-2 gap-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    </div>
  );
}
