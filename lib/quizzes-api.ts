// Teacher quiz endpoints (docs/api/quizzes.md). The editor sends the whole quiz on Save.
import { api } from "./api";
import type { Quiz, QuizListItem, QuizWriteRequest } from "./types";

type Options = { signal?: AbortSignal };

export const quizzesApi = {
  /** Most recently edited first. */
  list: (options?: Options) => api.get<QuizListItem[]>("/quizzes", options),
  get: (id: number, options?: Options) => api.get<Quiz>(`/quizzes/${id}`, options),
  /** Not idempotent: a retry after a lost response creates a second quiz. */
  create: (body: QuizWriteRequest) => api.post<Quiz>("/quizzes", body),
  /** Replaces the title and every question. Idempotent, so safe to retry. */
  update: (id: number, body: QuizWriteRequest) => api.put<Quiz>(`/quizzes/${id}`, body),
  remove: (id: number) => api.delete<void>(`/quizzes/${id}`),
  /** A new quiz titled "<title> (copy)". Not idempotent. */
  duplicate: (id: number) => api.post<Quiz>(`/quizzes/${id}/duplicate`),
};
