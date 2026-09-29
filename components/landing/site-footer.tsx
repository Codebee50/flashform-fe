import Link from "next/link";
import { LogoSymbol } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";

const COLUMNS = [
  {
    heading: "Students",
    links: [{ label: "Join a room", href: "/#join" }],
  },
  {
    heading: "Teachers",
    links: [
      { label: "Create an account", href: "/register" },
      { label: "Log in", href: "/login" },
    ],
  },
  {
    heading: "Product",
    links: [
      { label: "How it works", href: "/#how-it-works" },
      // { label: "Reliability", href: "/#reliability" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-page px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 py-16 sm:flex-row sm:items-end sm:justify-between lg:py-20">
          <div>
            <h2 className="text-h1 font-semibold text-balance text-text">Free for every classroom.</h2>
            <p className="mt-3 max-w-prose text-body-lg text-text-muted">
              No paywall, no ads, no student accounts. Set up your first room before the bell.
            </p>
          </div>
          <ButtonLink href="/register" size="lg" className="shrink-0">
            Create a free teacher account
          </ButtonLink>
        </div>

        <div className="grid gap-10 border-t border-border py-10 sm:grid-cols-2 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <Link href="/" aria-label="Flashform home" className="inline-flex items-center gap-2 rounded-sm">
              <LogoSymbol className="size-5" />
              <span className="text-body-lg font-semibold tracking-wordmark text-text">Flashform</span>
            </Link>
            <p className="mt-3 max-w-xs text-body text-text-muted">
              A free, reliable clicker for your classroom.
            </p>
          </div>

          <nav aria-label="Footer" className="grid grid-cols-3 gap-6 sm:col-span-1 lg:col-span-6">
            {COLUMNS.map((column) => (
              <div key={column.heading}>
                <p className="text-label font-medium text-text">{column.heading}</p>
                <ul className="mt-3 space-y-2">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="rounded-sm text-body text-text-muted transition-colors duration-150 ease-brand hover:text-text"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-2 border-t border-border py-6 text-caption text-text-subtle sm:flex-row sm:justify-between">
          <p>© 2026 Flashform</p>
          <p>Ask once. Hear everyone.</p>
        </div>
      </div>
    </footer>
  );
}
