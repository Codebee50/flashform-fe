import type { ConnectionStatus } from "@/lib/types";

const looks: Record<Exclude<ConnectionStatus, "not_found">, { dot: string; label: string }> = {
  connecting: { dot: "bg-text-subtle", label: "Connecting…" },
  live: { dot: "bg-success", label: "Live" },
  reconnecting: { dot: "bg-warning", label: "Reconnecting…" },
};

/**
 * Whether live updates are flowing (PRD §10): green "Live", amber "Reconnecting…" while the
 * socket is down and polling fills in. A plain dot and label, so it doesn't read as one of
 * the activity badges. Renders nothing once the room is gone: the page says so instead.
 */
export function ConnectionIndicator({
  status,
  className = "",
}: {
  status: ConnectionStatus;
  className?: string;
}) {
  if (status === "not_found") return null;
  const { dot, label } = looks[status];
  return (
    <span
      role="status"
      className={`inline-flex items-center gap-2 text-body font-medium text-text-muted ${className}`}
    >
      <span className={`size-2 shrink-0 rounded-full ${dot}`} aria-hidden />
      {label}
    </span>
  );
}
