"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** This site's origin (`https://host`), or null during the server render. */
export function useOrigin(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => window.location.origin,
    () => null,
  );
}
