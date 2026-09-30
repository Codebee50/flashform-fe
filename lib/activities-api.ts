// Teacher activity endpoints (docs/api/activities.md).
import { api } from "./api";
import { roomsApi } from "./rooms-api";
import type { ActivityMode, QuickQuestionRequest, TeacherState } from "./types";

type Options = { signal?: AbortSignal };

export const activitiesApi = {
  /** Everything the live view shows: activity, questions, participants, responses, summaries. */
  teacherState: (id: number, options?: Options) =>
    api.get<TeacherState>(`/activities/${id}/teacher-state`, options),
  /**
   * Ends any LIVE activity in the room first. Not idempotent: after a failure with no
   * response, check the room's `live_activity` before retrying.
   */
  startQuick: (roomId: number, question: QuickQuestionRequest) =>
    api.post<TeacherState>(`/rooms/${roomId}/activities`, { type: "QUICK", question }),
  /**
   * Runs a saved quiz (a snapshot of it). Same rules as `startQuick`. 404 `quiz_not_found`
   * leaves the LIVE activity running. `shuffle_questions` is for `STUDENT_PACED` only: it's a
   * 400 with `TEACHER_PACED`.
   */
  startQuiz: (
    roomId: number,
    quiz: {
      quiz_id: number;
      mode: ActivityMode;
      show_feedback: boolean;
      shuffle_questions: boolean;
    },
  ) => api.post<TeacherState>(`/rooms/${roomId}/activities`, { type: "QUIZ", ...quiz }),
  /**
   * Teacher-paced: shows question `index` (absolute, 0-based) to everyone and locks the
   * answers to the one being left. Idempotent, so safe to retry with the same index.
   */
  navigate: (id: number, index: number) =>
    api.post<TeacherState>(`/activities/${id}/navigate`, { index }),
  /**
   * Start Vote (PRD QQ4): ends this LIVE short answer quick question and starts a quick MC
   * one whose options are its distinct answers. Returns the new activity. Retry-safe: a
   * second call is 409 `activity_ended` and starts nothing, so on that 409 look up the room's
   * `live_activity`. 409 `not_enough_answers` (under 2 distinct answers) changes nothing.
   */
  vote: (id: number) => api.post<TeacherState>(`/activities/${id}/vote`),
  /** Safe to retry: ending an ended activity is a no-op. */
  end: (id: number) => api.post<TeacherState>(`/activities/${id}/end`),
  /**
   * Hides or shows the results on every teacher screen (PRD L4). Send the value wanted, not
   * a toggle: sending the current one is a no-op, so it's safe to retry.
   */
  setHideResults: (id: number, hideResults: boolean) =>
    api.patch<TeacherState>(`/activities/${id}`, { hide_results: hideResults }),
  /**
   * Sends the student back to the join screen (PRD L5). Idempotent. 404
   * `participant_not_found` when they aren't in this activity.
   */
  removeParticipant: (id: number, participantId: string) =>
    api.delete<void>(`/activities/${id}/participants/${encodeURIComponent(participantId)}`),
};

/**
 * After a start request lost its response (`network_error`): the new activity's state, if
 * it did start, so the teacher isn't offered a retry that would end it again.
 */
export async function findStartedActivity(
  roomId: number,
  previousId: number | null,
): Promise<TeacherState | null> {
  try {
    const room = await roomsApi.get(roomId);
    const live = room.live_activity;
    if (!live || live.id === previousId) return null;
    return await activitiesApi.teacherState(live.id);
  } catch {
    return null;
  }
}
