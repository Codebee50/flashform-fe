"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import type { User } from "@/lib/types";
import { useGuardedNavigate, useLeaveGuard } from "./leave-guard";

export function TeacherHeader({ user, onLogout }: { user: User; onLogout: () => Promise<void> }) {
  const [pending, setPending] = useState(false);
  const guardNavigate = useGuardedNavigate();
  const { confirmLeave } = useLeaveGuard();

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex h-16 max-w-page items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/teacher"
          aria-label="Dashboard"
          className="rounded-sm"
          onNavigate={guardNavigate("/teacher")}
        >
          <Logo />
        </Link>
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <span className="hidden truncate text-body text-text-muted sm:inline">{user.email}</span>
          <Button
            variant="ghost"
            disabled={pending}
            onClick={() =>
              confirmLeave(() => {
                setPending(true);
                void onLogout();
              })
            }
          >
            <LogOut className="size-4" strokeWidth={1.75} aria-hidden />
            {pending ? "Logging out…" : "Log out"}
          </Button>
        </div>
      </div>
    </header>
  );
}
