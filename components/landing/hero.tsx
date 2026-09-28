import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { JoinForm } from "./join-form";
import { LiveResultsPreview } from "./live-results-preview";

export function Hero() {
  return (
    <section aria-labelledby="hero-title">
      <div className="mx-auto grid max-w-page gap-12 px-4 pt-12 pb-16 sm:px-6 sm:pt-16 lg:grid-cols-12 lg:gap-16 lg:px-8 lg:pt-24 lg:pb-24">
        <div className="lg:col-span-6 lg:pt-4">
          <h1
            id="hero-title"
            className="text-display-sm font-semibold text-text sm:text-display"
          >
            Ask once.
            <br />
            Hear everyone.
          </h1>
          <p className="mt-5 max-w-prose text-body-lg text-text-muted sm:text-h3 sm:font-normal">
            A free, reliable clicker for your classroom. Students answer from any phone with a room
            code. You see every answer the moment it lands, even when all forty join at once.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/register" size="lg">
              Create a free teacher account
            </ButtonLink>
            <div className="hidden sm:block">
              <ButtonLink href="#how-it-works" variant="ghost" size="lg">
                See how it works
              </ButtonLink>
            </div>
          </div>

          <div className="mt-8 max-w-md border-t border-border pt-6 sm:mt-10 sm:pt-8">
            <JoinForm />
            <p className="mt-4 text-body text-text-muted">
              <Link
                href="/login"
                className="rounded-sm font-medium text-text underline underline-offset-4 decoration-border-strong transition-colors duration-150 ease-brand hover:decoration-text"
              >
                I&apos;m a teacher
              </Link>
            </p>
          </div>
        </div>

        <div className="lg:col-span-6">
          <LiveResultsPreview />
        </div>
      </div>
    </section>
  );
}
