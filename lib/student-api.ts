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
  /** 404 `room_not_found`, 423 `room_locked`, 409 `no_live_activity`. Not idempotent. */
  join: (code: string, name: string, options?: Options) =>
    api.post<JoinResult>(
      `/rooms/${encodeURIComponent(code)}/join`,
      { name },
      { ...options, auth: false },
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
  leave: (token: string) => api.post<void>("/participant/leave", undefined, student(token)),
};
