"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Seconds left before an action may run again. Used to disable "send email" buttons
 * briefly after a click so teachers don't hit the per-email rate limits.
 */
export function useCooldown(): [remaining: number, start: (seconds: number) => void] {
  const [until, setUntil] = useState(0);
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (until === 0) return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= until) {
        setUntil(0);
        window.clearInterval(id);
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [until]);

  const start = useCallback((seconds: number) => {
    const t = Date.now();
    setNow(t);
    setUntil(t + seconds * 1000);
  }, []);

  return [until === 0 ? 0 : Math.max(0, Math.ceil((until - now) / 1000)), start];
}
