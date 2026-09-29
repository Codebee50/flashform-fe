"use client";

// Saving a student's answer so it's never dropped (PRD S4, docs/api/activities.md).
//
// Submitting is an upsert, so retrying is always safe. Anything that isn't a final answer
// from the server (network error, timeout, 5xx, 429, a stale token) is retried with backoff
// until it succeeds, and the answer is kept in the stored session meanwhile, so closing the
// tab mid-retry resumes it on the next visit.
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "./api";
import { backoffDelay } from "./socket";
import { readSession, updateSession } from "./student-session";
import { studentApi } from "./student-api";
import type { Answer, StudentQuestion, StudentResponse } from "./types";

const REQUEST_TIMEOUT_MS = 10_000;

export type SaveStatus =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "retrying" }
  /** The server refused this answer for good (locked, moved on, ended…). */
  | { kind: "rejected"; error: ApiError };

/** 409, 404 and 400 won't change on retry: refetch the state instead. */
function isFinal(error: unknown): error is ApiError {
  return (
    error instanceof ApiError &&
    (error.status === 409 || error.status === 404 || error.status === 400)
  );
}

const sameAnswer = (a: Answer, b: Answer) => JSON.stringify(a) === JSON.stringify(b);

/**
 * The more recent of two saved answers. Locking only ever goes one way, so a locked answer
 * (and its feedback) wins; otherwise the later submit does.
 */
function newer(a: StudentResponse | null, b: StudentResponse | null) {
  if (!a || !b) return a ?? b;
  if (a.is_locked !== b.is_locked) return a.is_locked ? a : b;
  return Date.parse(a.submitted_at) >= Date.parse(b.submitted_at) ? a : b;
}

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    const timer = window.setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      window.clearTimeout(timer);
      resolve();
    });
  });
}

/**
 * The answer on screen for one question and whether it's saved. `onRejected` runs after a
 * final refusal (refetch there); `onTokenRefused` after a 401 (the state refetch re-joins,
 * and the next attempt uses the new token).
 */
export function useAnswer({
  code,
  activityId,
  question,
  onRejected,
  onTokenRefused,
}: {
  code: string;
  activityId: number;
  question: StudentQuestion;
  onRejected: (error: ApiError) => void;
  onTokenRefused: () => void;
}) {
  // An answer left unsaved by a closed tab or a reload: show it and send it again.
  const [resumed] = useState(
    () =>
      readSession(code)?.pending.find(
        (p) => p.activityId === activityId && p.questionId === question.id,
      )?.answer ?? null,
  );
  const [local, setLocal] = useState<Answer | null>(resumed);
  const [status, setStatus] = useState<SaveStatus>(
    resumed ? { kind: "saving" } : question.response ? { kind: "saved" } : { kind: "idle" },
  );
  // The server's reply to our last save. Newer than `question.response` until the state is
  // refetched, and with feedback on it's already locked and carries the feedback.
  const [confirmed, setConfirmed] = useState<StudentResponse | null>(null);

  // The answer still to send; replaced when the student changes it mid-save.
  const latest = useRef<Answer | null>(resumed);
  // The signal of the loop that's sending, so a loop from before a remount can't clear it.
  const running = useRef<AbortSignal | null>(null);
  const alive = useRef<AbortController | null>(null);
  const callbacks = useRef({ onRejected, onTokenRefused });
  useEffect(() => {
    callbacks.current = { onRejected, onTokenRefused };
  });

  const clearPending = useCallback(
    (answer: Answer) =>
      updateSession(code, (session) => ({
        ...session,
        pending: session.pending.filter(
          (p) => !(p.questionId === question.id && sameAnswer(p.answer, answer)),
        ),
      })),
    [code, question.id],
  );

  const run = useCallback(async () => {
    const signal = alive.current?.signal;
    if (!signal || running.current === signal) return;
    running.current = signal;
    let attempt = 0;

    while (latest.current && !signal.aborted) {
      const sending = latest.current;
      const token = readSession(code)?.token;
      try {
        if (!token) throw new ApiError(401, { code: "no_token", detail: "Rejoining." });
        const reply = await studentApi.submit(token, question.id, sending, {
          signal: AbortSignal.any([signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)]),
        });
        if (signal.aborted) break;
        attempt = 0;
        setConfirmed(reply);
        if (latest.current === sending) {
          latest.current = null;
          clearPending(sending);
          setStatus({ kind: "saved" });
        }
      } catch (error) {
        if (signal.aborted) break;
        if (isFinal(error)) {
          latest.current = null;
          clearPending(sending);
          // Show what the server has instead (the refetch brings it), not what it refused.
          setLocal(null);
          setStatus({ kind: "rejected", error });
          callbacks.current.onRejected(error);
          break;
        }
        if (error instanceof ApiError && error.status === 401) callbacks.current.onTokenRefused();
        setStatus({ kind: "retrying" });
        const wait =
          error instanceof ApiError && error.retryAfter
            ? error.retryAfter * 1000
            : backoffDelay(attempt);
        attempt += 1;
        await sleep(wait, signal);
      }
    }
    if (running.current === signal) running.current = null;
  }, [code, question.id, clearPending]);

  const submit = useCallback(
    (answer: Answer) => {
      setLocal(answer);
      latest.current = answer;
      updateSession(code, (session) => ({
        ...session,
        pending: [
          ...session.pending.filter((p) => p.questionId !== question.id),
          { activityId, questionId: question.id, answer },
        ],
      }));
      // While retrying, keep saying so: the new answer waits for the same connection.
      setStatus((current) => (current.kind === "retrying" ? current : { kind: "saving" }));
      void run();
    },
    [code, activityId, question.id, run],
  );

  useEffect(() => {
    const controller = new AbortController();
    alive.current = controller;
    // Picks up a resumed answer, or one a remount interrupted.
    if (latest.current) void run();
    return () => controller.abort();
  }, [run]);

  const saved = newer(confirmed, question.response);
  const answer: Answer | null =
    local ??
    (saved
      ? saved.choice_index !== null
        ? { choice_index: saved.choice_index }
        : { text_answer: saved.text_answer }
      : null);

  return {
    answer,
    status,
    submit,
    locked: saved?.is_locked ?? false,
    /** Correct/incorrect and the explanation, once the answer is locked with feedback on. */
    feedback: saved?.feedback ?? null,
  };
}
