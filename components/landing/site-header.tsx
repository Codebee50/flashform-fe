import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";

const navLink =
  "rounded-sm text-body text-text-muted transition-colors duration-150 ease-brand hover:text-text";

export function SiteHeader() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-16 max-w-page items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label="Flashform home" className="rounded-sm">
          <Logo />
        </Link>

        <nav aria-label="Main" className="flex items-center gap-5 sm:gap-6">
          <Link href="#how-it-works" className={`hidden md:inline ${navLink}`}>
            How it works
          </Link>
          {/* Reliability section is commented out on the landing page for now.
          <Link href="#reliability" className={`hidden md:inline ${navLink}`}>
            Reliability
          </Link> */}
          <Link href="#join" className={`sm:hidden ${navLink}`}>
            Join a room
          </Link>
          <Link href="/login" className={navLink}>
            Log in
          </Link>
          <div className="hidden sm:block">
            <ButtonLink href="/register" variant="secondary">
              Create account
            </ButtonLink>
          </div>
        </nav>
      </div>
    </header>
  );
}
