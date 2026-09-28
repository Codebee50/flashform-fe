import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";

/** Centered single-card layout shared by the login, register and email-link pages. */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex h-16 w-full max-w-page items-center px-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label="Flashform home" className="rounded-sm">
          <Logo />
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pt-8 pb-16 sm:pt-16">
        <div className="w-full max-w-sm">{children}</div>
      </main>
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
