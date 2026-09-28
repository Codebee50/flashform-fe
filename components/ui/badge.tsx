import type { ReactNode } from "react";

type Tone = "neutral" | "success" | "warning";

const tones: Record<Tone, string> = {
  neutral: "border-border bg-surface-2 text-text-muted",
  success: "border-success/25 bg-success-subtle text-success",
  warning: "border-warning/25 bg-warning-subtle text-warning",
};

/** A small status label. Always has text, so color is never the only signal. */
export function Badge({
  tone = "neutral",
  children,
  className = "",
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={
        "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-sm border px-2 text-caption " +
        `font-medium ${tones[tone]} ${className}`
      }
    >
      {children}
    </span>
  );
}
