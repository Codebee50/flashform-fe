import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { LogoSymbol } from "@/components/brand/logo";
import { RoomCode } from "@/components/rooms/room-code";
import { ConnectionIndicator } from "@/components/ui/connection-indicator";
import type { ConnectionStatus } from "@/lib/types";

/**
 * The student page frame (BRAND.md §6): the room code and connection status on top, one
 * task in a single 480px column, and who you are plus "Leave room" at the bottom.
 */
export function StudentShell({
  code,
  status,
  footer,
  children,
}: {
  code: string;
  status?: ConnectionStatus;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-14 w-full max-w-student items-center justify-between gap-3 px-4">
          <span className="inline-flex min-w-0 items-center gap-2">
            <LogoSymbol className="size-5 shrink-0" />
            <span className="sr-only">Room</span>
            <RoomCode code={code} className="text-body-lg font-semibold text-text" />
          </span>
          {status && <ConnectionIndicator status={status} />}
        </div>
      </header>
      <main className="mx-auto w-full max-w-student flex-1 px-4 pt-8 pb-10">{children}</main>
      {footer && (
        <footer className="border-t border-border">
          <div className="mx-auto flex min-h-14 w-full max-w-student items-center justify-between gap-3 px-4 py-2">
            {footer}
          </div>
        </footer>
      )}
    </div>
  );
}

/** A short centered moment: waiting, ended, locked, not found. One sentence, one action. */
export function MessageScreen({
  icon: Icon,
  title,
  children,
  action,
}: {
  icon: LucideIcon;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center pt-10 text-center motion-safe:animate-fade-in">
      <div className="flex size-12 items-center justify-center rounded-full bg-surface-2">
        <Icon className="size-6 text-text-subtle" strokeWidth={1.75} aria-hidden />
      </div>
      <h1 className="mt-5 text-h2 font-semibold text-text">{title}</h1>
      {children && <div className="mt-2 max-w-prose text-body-lg text-text-muted">{children}</div>}
      {action && <div className="mt-8 w-full">{action}</div>}
    </div>
  );
}
