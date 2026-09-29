import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { ClassroomSketch } from "./classroom-sketch";

/**
 * Layout shared by the login, register and email-link pages: the form on the left,
 * and from lg up a classroom sketch on the right that stays put while the form scrolls.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid flex-1 lg:grid-cols-2">
      <div className="flex flex-col">
        <header className="flex h-16 items-center px-4 sm:px-6 lg:px-12">
          <Link href="/" aria-label="Flashform home" className="rounded-sm">
            <Logo />
          </Link>
        </header>
        <main className="flex flex-1 items-start justify-center px-4 pt-8 pb-16 sm:pt-16 lg:items-center lg:pt-0">
          <div className="w-full max-w-sm">{children}</div>
        </main>
      </div>

      <aside className="bg-sketch-paper hidden border-l border-border lg:sticky lg:top-0 lg:flex lg:h-svh lg:flex-col lg:px-12 lg:pt-16">
        <div className="mx-auto w-full max-w-lg">
          <p className="text-h2 font-semibold text-text">Ask once. Hear everyone.</p>
          <p className="mt-2 max-w-md text-body-lg text-text-muted">
            Students answer from any phone with a room code. You see every answer the moment it
            lands, even the quiet ones.
          </p>
        </div>
        {/* The drawing is cropped at its bottom edge, so it sits flush on the panel's edge. */}
        <div className="mx-auto mt-8 flex min-h-0 w-full max-w-lg flex-1 items-end">
          <ClassroomSketch className="max-h-full w-full" />
        </div>
      </aside>
    </div>
  );
}

export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="animate-fade-in">
      <div className="rounded-lg border border-border bg-surface p-6 sm:p-8">
        <h1 className="text-h2 font-semibold text-text">{title}</h1>
        {description && <div className="mt-2 text-body text-text-muted">{description}</div>}
        {children && <div className="mt-6">{children}</div>}
      </div>
      {footer && <div className="mt-6 text-center text-body text-text-muted">{footer}</div>}
    </div>
  );
}

export const textLink =
  "rounded-sm font-medium text-accent underline-offset-4 hover:text-accent-hover hover:underline";
