// Student endpoints (docs/api/activities.md, docs/api/rooms.md). No teacher auth: the
// participant token goes in `X-Participant-Token`.
import { api } from "./api";
import type { Answer, JoinResult, ParticipantState, PublicRoom, StudentResponse } from "./types";

type Options = { signal?: AbortSignal };

const student = (token: string, options?: Options) => ({
  auth: false,
  headers: { "X-Participant-Token": token },
  signal: options?.signal,
});

export const studentApi = {
  /** 404 `room_not_found`. `live_activity_id` is null while students should wait. */
  room: (code: string, options?: Options) =>
    api.get<PublicRoom>(`/rooms/${encodeURIComponent(code)}/public`, { ...options, auth: false }),
  /**
   * 404 `room_not_found`, 423 `room_locked`, 409 `no_live_activity`. Not idempotent. `token`
   * is the student's token from this room's last activity: it lets someone who already
   * joined back in through a lock (PRD R4).
   */
  join: (code: string, name: string, options?: Options & { token?: string | null }) =>
    api.post<JoinResult>(
      `/rooms/${encodeURIComponent(code)}/join`,
      { name },
      {
        auth: false,
        signal: options?.signal,
        headers: options?.token ? { "X-Participant-Token": options.token } : undefined,
      },
    ),
  state: (token: string, options?: Options) =>
    api.get<ParticipantState>("/participant/state", student(token, options)),
  /** Upsert: safe to retry. */
  submit: (token: string, questionId: number, answer: Answer, options?: Options) =>
    api.put<StudentResponse>(
      `/participant/responses/${questionId}`,
      answer,
      student(token, options),
    ),
  /**
   * Student-paced: locks every answer given. Idempotent (same body again), so safe to retry.
   * 409 `not_student_paced` / `activity_ended`.
   */
  finish: (token: string) =>
    api.post<ParticipantState>("/participant/finish", undefined, student(token)),
  leave: (token: string) => api.post<void>("/participant/leave", undefined, student(token)),
};
