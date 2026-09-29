"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Sets data-reveal="waiting" until the children scroll into view, then "shown", so CSS can
 * hold an entrance animation for sections below the fold. Without JS (or before hydration)
 * there's no attribute and the content simply shows as is.
 */
export function RevealOnView({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.dataset.reveal = "shown";
          observer.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    el.dataset.reveal = "waiting";
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
