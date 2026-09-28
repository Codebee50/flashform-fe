"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { LeaveGuardProvider } from "./leave-guard";
import { TeacherHeader } from "./teacher-header";

/** Renders teacher pages only for a logged-in teacher; everyone else goes to /login (T3). */
export function TeacherGate({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const unauthenticated = auth.status === "unauthenticated";
  const loggedOut = unauthenticated && auth.reason === "logged_out";

  useEffect(() => {
    if (!unauthenticated) return;
    router.replace(loggedOut ? "/login" : `/login?next=${encodeURIComponent(pathname)}`);
  }, [unauthenticated, loggedOut, pathname, router]);

  if (auth.status === "authenticated") {
    return (
      <LeaveGuardProvider>
        <TeacherHeader user={auth.user} onLogout={auth.logout} />
        <main className="flex-1">{children}</main>
      </LeaveGuardProvider>
    );
  }

  if (auth.status === "error") {
    return (
      <main className="mx-auto w-full max-w-sm flex-1 px-4 pt-24">
        <Notice tone="danger">
          Can&apos;t reach Flashform right now. Check your connection and try again.
        </Notice>
        <Button className="mt-4 w-full" onClick={auth.reload}>
          Try again
        </Button>
      </main>
    );
  }

  // Loading, or about to redirect to /login.
  return (
    <main className="flex flex-1 items-center justify-center" aria-busy="true">
      <p className="text-body text-text-subtle">Loading…</p>
    </main>
  );
}
