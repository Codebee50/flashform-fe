"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage } from "./api";
import { classifyEvent } from "./socket";
import type { RoomEvent } from "./types";

/** A state endpoint's response: TeacherState or ParticipantState. */
type VersionedState = { activity: { id: number; version: number } };

/**
 * Loads the state for `activityId` (null: no activity known yet). Resolve to null when
 * there is nothing to show. Student fetchers can ignore the id: their token picks it.
 */
export type ActivityFetcher<T> = (
  activityId: number | null,
  signal: AbortSignal,
) => Promise<T | null>;

export type ActivityState<T> = {
  /** The latest state, or null before the first load or when there is no activity. */
  state: T | null;
  /** True until the first fetch has finished, successfully or not. */
  loading: boolean;
  /**
   * The last fetch's error, cleared by the next success. `state` keeps the last good data.
   * `cause` is what the fetcher threw, for screens that react to specific API errors.
   */
  error: { message: string; cause: unknown } | null;
  /** Refetches the full state. Concurrent calls share one request plus at most one follow-up. */
  refetch: () => void;
  /** Shows a state the caller already has, e.g. the response to a start or end request. */
  replace: (next: T) => void;
  /**
   * Refetches if the event is newer than what's on screen (switching to its activity when a
   * newer one started) and says how it relates, so callers can skip stale events too.
   */
  handleEvent: (event: RoomEvent) => ReturnType<typeof classifyEvent>;
};

/**
 * Owns an activity's state, rebuilt from one REST call every time (PRD §6 rule 4). Pass
 * `refetch` and `handleEvent` to a room socket hook.
 */
export function useActivityState<T extends VersionedState>(
  fetcher: ActivityFetcher<T>,
  /** The activity to load first; later ones are followed from events. */
  { activityId = null }: { activityId?: number | null } = {},
): ActivityState<T> {
  const [state, setState] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ActivityState<T>["error"]>(null);

  // The activity and version on screen, from the last state response (never from an event:
  // an event only promises a version, the response is what we actually have).
  const current = useRef<{ activityId: number; version: number } | null>(null);
  // The activity to fetch. Moves ahead of `current` when an event names a newer activity.
  const target = useRef(activityId);
  const inFlight = useRef(false);
  const pending = useRef(false);
  const controller = useRef<AbortController | null>(null);

  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  /** Records `next` as the state on screen, unless something newer is already there. */
  const accept = useCallback((next: T | null) => {
    const shown = current.current;
    if (
      next &&
      shown &&
      (next.activity.id < shown.activityId ||
        (next.activity.id === shown.activityId && next.activity.version < shown.version))
    ) {
      return;
    }
    current.current = next
      ? { activityId: next.activity.id, version: next.activity.version }
      : null;
    if (next && (target.current === null || next.activity.id > target.current)) {
      target.current = next.activity.id;
    }
    setState(next);
    setError(null);
    setLoading(false);
  }, []);

  const refetch = useCallback(() => {
    if (inFlight.current) {
      // Coalesce: one more request once this one returns, however many asked.
      pending.current = true;
      return;
    }
    const signal = controller.current?.signal;
    if (!signal || signal.aborted) return;
    inFlight.current = true;

    void (async () => {
      do {
        pending.current = false;
        try {
          const next = await fetcherRef.current(target.current, signal);
          if (signal.aborted) return;
          accept(next);
        } catch (err) {
          if (signal.aborted) return;
          setError({ message: errorMessage(err), cause: err });
          setLoading(false);
        }
      } while (pending.current);
      inFlight.current = false;
    })();
  }, [accept]);

  const handleEvent = useCallback(
    (event: RoomEvent) => {
      const kind = classifyEvent(event, current.current);
      if (kind === "stale") return kind;
      if (target.current === null || event.activity_id > target.current) {
        target.current = event.activity_id;
      }
      refetch();
      return kind;
    },
    [refetch],
  );

  useEffect(() => {
    const abort = new AbortController();
    controller.current = abort;
    inFlight.current = false;
    pending.current = false;
    refetch();
    return () => abort.abort();
  }, [refetch]);

  return { state, loading, error, refetch, replace: accept, handleEvent };
}
