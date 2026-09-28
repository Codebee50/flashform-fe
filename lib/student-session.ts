"use client";

// A student's identity per room, kept in localStorage (PRD §7, S3): the name to re-join
// with, the participant token for the current activity, and an answer that hasn't been
// confirmed yet. Every read goes to storage, so tabs share the latest session.
import { useCallback, useSyncExternalStore } from "react";
import type { Answer } from "./types";

/** An answer the server hasn't confirmed. Kept so closing the tab mid-retry loses nothing. */
export type PendingAnswer = { activityId: number; questionId: number; answer: Answer };

export type StudentSession = {
  roomCode: string;
  name: string;
  /** Null until joined, and after the server refused it. */
  token: string | null;
  activityId: number | null;
  pending: PendingAnswer | null;
};

const PREFIX = "flashform.student.";
const key = (code: string) => `${PREFIX}${code.toUpperCase()}`;

type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  for (const listener of listeners) listener();
}

function readRaw(code: string): string | null {
  try {
    return window.localStorage.getItem(key(code));
  } catch {
    return null;
  }
}

function parse(raw: string | null): StudentSession | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as Partial<StudentSession>;
    if (typeof data.roomCode !== "string" || typeof data.name !== "string") return null;
    return {
      roomCode: data.roomCode,
      name: data.name,
      token: typeof data.token === "string" ? data.token : null,
      activityId: typeof data.activityId === "number" ? data.activityId : null,
      pending: data.pending ?? null,
    };
  } catch {
    return null;
  }
}

export function readSession(code: string): StudentSession | null {
  return parse(readRaw(code));
}

/** Saves the session for its room, or forgets the room's session when given null. */
export function writeSession(code: string, session: StudentSession | null) {
  try {
    if (session) window.localStorage.setItem(key(code), JSON.stringify(session));
    else window.localStorage.removeItem(key(code));
  } catch {
    // Storage full or blocked: the session lasts until the page is closed.
  }
  notify();
}

/** Applies `change` to the stored session, if there is one. */
export function updateSession(code: string, change: (session: StudentSession) => StudentSession) {
  const session = readSession(code);
  if (session) writeSession(code, change(session));
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key.startsWith(PREFIX)) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

// useSyncExternalStore needs the same object back while nothing changed.
const cache = new Map<string, { raw: string | null; session: StudentSession | null }>();

function snapshot(code: string): StudentSession | null {
  const raw = readRaw(code);
  const cached = cache.get(code);
  if (cached && cached.raw === raw) return cached.session;
  const session = parse(raw);
  cache.set(code, { raw, session });
  return session;
}

/** The stored session for a room, kept in sync with storage. Null during the server render. */
export function useStudentSession(code: string): StudentSession | null {
  const getSnapshot = useCallback(() => snapshot(code.toUpperCase()), [code]);
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
