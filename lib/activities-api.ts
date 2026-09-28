// Teacher activity endpoints (docs/api/activities.md).
import { api } from "./api";
import type { QuickQuestionRequest, TeacherState } from "./types";

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
  /** Safe to retry: ending an ended activity is a no-op. */
  end: (id: number) => api.post<TeacherState>(`/activities/${id}/end`),
};
