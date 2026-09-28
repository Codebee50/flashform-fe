"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { getFreshAccessToken } from "./api";
import {
  ReconnectingSocket,
  STUDENT_EVENT_TYPES,
  TEACHER_EVENT_TYPES,
  wsUrl,
  type ReconnectingSocketOptions,
} from "./socket";
import type { ConnectionStatus, RoomEvent, StudentEvent, TeacherEvent } from "./types";

type Handlers<E extends RoomEvent> = {
  onEvent?: (event: E) => void;
  /**
   * Refetches the full state. Called on every connect and reconnect, and every 3 s while
   * the socket has been down for more than 5 s.
   */
  refetch?: () => void;
  /** The room doesn't exist, or isn't this teacher's (4404). The socket has given up. */
  onNotFound?: () => void;
};

type SocketConfig = Pick<
  ReconnectingSocketOptions<RoomEvent>,
  "eventTypes" | "getUrl" | "onUnauthorized"
>;

/**
 * Runs a ReconnectingSocket for as long as the component is mounted with the same `key`.
 * Handlers may change on every render without reconnecting; a new `connectionKey` (e.g. a
 * new token) reconnects without going back to "Connecting…".
 */
function useRoomSocket<E extends RoomEvent>(
  key: string,
  config: SocketConfig,
  handlers: Handlers<E>,
  connectionKey: string | null = null,
): { status: ConnectionStatus } {
  // Keyed, so a new room starts at "connecting" without resetting state in an effect.
  const [current, setCurrent] = useState<{ key: string; status: ConnectionStatus }>({
    key,
    status: "connecting",
  });

  const getUrl = useEffectEvent(() => config.getUrl());
  const onUnauthorized = useEffectEvent(() => config.onUnauthorized?.());
  const onEvent = useEffectEvent((event: E) => handlers.onEvent?.(event));
  const refetch = useEffectEvent(() => handlers.refetch?.());
  const onStatus = useEffectEvent((status: ConnectionStatus) => {
    setCurrent({ key, status });
    if (status === "not_found") handlers.onNotFound?.();
  });
  const eventTypes = config.eventTypes as ReadonlySet<E["type"]>;
  const canReauthorize = config.onUnauthorized !== undefined;

  useEffect(() => {
    const socket = new ReconnectingSocket<E>({
      eventTypes,
      getUrl: () => getUrl(),
      onEvent: (event) => onEvent(event),
      onStatus: (status) => onStatus(status),
      onConnected: () => refetch(),
      refetch: () => refetch(),
      onUnauthorized: canReauthorize ? () => onUnauthorized() : undefined,
    });
    socket.start();
    return () => socket.stop();
  }, [key, connectionKey, eventTypes, canReauthorize]);

  return { status: current.key === key ? current.status : "connecting" };
}

/**
 * The teacher's live room socket. Every connect and reconnect first gets an access token
 * that's valid for another minute: the server only checks it at connect time. On 4401 the
 * token is refreshed and the socket reconnects at once; if the refresh token is rejected,
 * the session is over and the page goes to /login.
 */
export function useTeacherRoomSocket(roomId: number, handlers: Handlers<TeacherEvent> = {}) {
  return useRoomSocket(
    `teacher:${roomId}`,
    {
      eventTypes: TEACHER_EVENT_TYPES,
      getUrl: async () => wsUrl(`/teacher/room/${roomId}/`, { auth: await getFreshAccessToken() }),
      onUnauthorized: async () => {
        await getFreshAccessToken({ force: true });
      },
    },
    handlers,
  );
}

/**
 * A student's room socket. It reconnects whenever `token` changes (after joining, or
 * re-joining for a new activity), so the server always sees the current participant.
 * Without a token it still gets activity events (the waiting screen). On 4401 the token was
 * refused: `onTokenRejected` should forget it, and the socket reconnects without one.
 */
export function useStudentRoomSocket(
  code: string,
  {
    token,
    onTokenRejected,
    ...handlers
  }: Handlers<StudentEvent> & {
    token: string | null;
    onTokenRejected?: () => void;
  },
) {
  return useRoomSocket(
    `student:${code.toUpperCase()}`,
    {
      eventTypes: STUDENT_EVENT_TYPES,
      getUrl: () => wsUrl(`/room/${encodeURIComponent(code)}/`, { token }),
      onUnauthorized: () => onTokenRejected?.(),
    },
    handlers,
    token,
  );
}
