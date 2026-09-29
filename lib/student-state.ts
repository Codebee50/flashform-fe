// Works out what a student should see, from the stored session and the API. The student
// screen only ever loads through this (first load, reconnects, polling, socket events), so
// every path lands on the same screen (PRD S3):
//
// - A token for a LIVE activity: that activity's state.
// - Otherwise, if the room has a LIVE activity the student isn't in: join it with the saved
//   name (PRD §7), store the new token, and return its state.
// - Otherwise the ended activity's state ("This activity has ended"), or null (waiting).
import { ApiError } from "./api";
import { readSession, updateSession } from "./student-session";
import { studentApi } from "./student-api";
import type { JoinResult, ParticipantState } from "./types";

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      window.clearTimeout(timer);
      reject(signal.reason);
    });
  });
}

/**
 * Joins the live activity. Null when it ended in the meantime (409 `no_live_activity`).
 * A 429 waits for as long as the server says and tries again: a class behind one school
 * IP re-joining together can hit the limit, and that isn't the student's problem.
 */
async function join(code: string, name: string, signal: AbortSignal): Promise<JoinResult | null> {
  for (;;) {
    try {
      return await studentApi.join(code, name, { signal });
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      if (error.code === "no_live_activity") return null;
      if (error.status !== 429) throw error;
      await sleep((error.retryAfter ?? 5) * 1000, signal);
    }
  }
}

/**
 * The student's current state, or null for the waiting screen (or when there's no session).
 * Throws the API's errors: 404 `room_not_found`, 423 `room_locked`, network errors.
 */
export async function loadStudentState(
  code: string,
  signal: AbortSignal,
): Promise<ParticipantState | null> {
  const session = readSession(code);
  if (!session) return null;

  let current: ParticipantState | null = null;
  if (session.token) {
    try {
      current = await studentApi.state(session.token, { signal });
      if (current.activity.status === "LIVE") return current;
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 401)) throw error;
      // Left, removed, or unknown: forget the token and join again with the saved name.
      const refused = session.token;
      updateSession(code, (s) => (s.token === refused ? { ...s, token: null } : s));
    }
  }

  const room = await studentApi.room(code, { signal });
  if (room.live_activity_id === null || room.live_activity_id === current?.activity.id) {
    return current;
  }

  const joined = await join(room.code, session.name, signal);
  if (!joined) return current;
  updateSession(code, (s) => ({
    ...s,
    token: joined.token,
    activityId: joined.activity_id,
    // Unsaved answers survive re-joining the same activity; ones for an old activity can't
    // be saved any more.
    pending: s.pending.filter((p) => p.activityId === joined.activity_id),
  }));
  return studentApi.state(joined.token, { signal });
}
