// Teacher JWTs, kept in localStorage (PRD §8) so the session survives reloads.
// Every read goes to storage, so all tabs share the latest rotated pair.
import type { TokenPair } from "./types";

const ACCESS_KEY = "flashform.access";
const REFRESH_KEY = "flashform.refresh";

type Listener = () => void;
const listeners = new Set<Listener>();

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function notify() {
  for (const listener of listeners) listener();
}

export function getAccessToken(): string | null {
  return read(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  return read(REFRESH_KEY);
}

export function hasTokens(): boolean {
  return getRefreshToken() !== null;
}

export function setTokens({ access, refresh }: TokenPair) {
  try {
    window.localStorage.setItem(ACCESS_KEY, access);
    window.localStorage.setItem(REFRESH_KEY, refresh);
  } catch {
    // Storage full or blocked: the session lasts until the page is closed.
  }
  notify();
}

export function clearTokens() {
  try {
    window.localStorage.removeItem(ACCESS_KEY);
    window.localStorage.removeItem(REFRESH_KEY);
  } catch {
    // Nothing stored, nothing to clear.
  }
  notify();
}

/**
 * Calls `listener` whenever the tokens change, in this tab or another one
 * (logging out in one tab logs out the others). Returns an unsubscribe function.
 */
export function subscribeTokens(listener: Listener): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === ACCESS_KEY || event.key === REFRESH_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Seconds since the epoch at which a JWT expires, or null if it can't be read. */
export function tokenExpiry(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const exp: unknown = JSON.parse(json).exp;
    return typeof exp === "number" ? exp : null;
  } catch {
    return null;
  }
}
