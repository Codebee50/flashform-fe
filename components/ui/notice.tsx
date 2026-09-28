import { CircleAlert, CircleCheck, Info, TriangleAlert, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type Tone = "info" | "success" | "warning" | "danger";

const tones: Record<Tone, { className: string; Icon: LucideIcon }> = {
  info: { className: "border-border bg-surface-2 text-text", Icon: Info },
  success: { className: "border-success/30 bg-success-subtle text-text", Icon: CircleCheck },
  warning: { className: "border-warning/30 bg-warning-subtle text-text", Icon: TriangleAlert },
  danger: { className: "border-danger/30 bg-danger-subtle text-text", Icon: CircleAlert },
};

const iconColor: Record<Tone, string> = {
  info: "text-text-muted",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
};

/** An inline message box. Icon plus color, so color is never the only signal. */
export function Notice({
  tone = "info",
  children,
  className = "",
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  const { className: toneClass, Icon } = tones[tone];
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={`flex gap-2.5 rounded-md border px-3.5 py-3 text-body ${toneClass} ${className}`}
    >
      <Icon className={`mt-px size-4 shrink-0 ${iconColor[tone]}`} strokeWidth={2} aria-hidden />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
