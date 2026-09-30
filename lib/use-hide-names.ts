"use client";

// "Hide names" on the live room page (PRD L4). Only changes how this browser draws names, so
// it lives in localStorage rather than on the server (docs/api/activities.md). Tabs share it:
// flip it on the laptop and the projector window follows.
import { useCallback, useSyncExternalStore } from "react";

const KEY = "flashform.teacher.hideNames";

type Listener = () => void;
const listeners = new Set<Listener>();
// Used when storage is blocked: the setting then lasts until the page is closed.
let fallback = false;

function read(): boolean {
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return fallback;
  }
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Whether names are hidden, and a setter. False during the server render. */
export function useHideNames(): [boolean, (hide: boolean) => void] {
  const hidden = useSyncExternalStore(subscribe, read, () => false);
  const setHidden = useCallback((hide: boolean) => {
    fallback = hide;
    try {
      if (hide) window.localStorage.setItem(KEY, "1");
      else window.localStorage.removeItem(KEY);
    } catch {
      // Storage blocked: `fallback` holds it.
    }
    for (const listener of listeners) listener();
  }, []);
  return [hidden, setHidden];
}
