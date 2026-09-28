"use client";

import { useEffect, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { ApiError, errorMessage } from "@/lib/api";
import { authApi } from "@/lib/auth-api";
import { AuthCard } from "./auth-shell";
import { ResendVerificationForm } from "./resend-verification";

type State =
  | { status: "verifying" }
  | { status: "verified"; detail: string }
  | { status: "invalid" }
  | { status: "failed"; message: string };

export function VerifyEmail({ token }: { token: string | null }) {
  const [state, setState] = useState<State>(
    token ? { status: "verifying" } : { status: "invalid" },
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    // Idempotent on the server, so strict mode's double effect in dev is harmless.
    authApi.verifyEmail(token).then(
      ({ detail }) => {
        if (!cancelled) setState({ status: "verified", detail });
      },
      (error: unknown) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 400) setState({ status: "invalid" });
        else setState({ status: "failed", message: errorMessage(error) });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [token, attempt]);

  if (state.status === "verifying") {
    return (
      <AuthCard title="Verifying your email" description="This only takes a moment." />
    );
  }

  if (state.status === "verified") {
    return (
      <AuthCard title="Email verified">
        <Notice tone="success">{state.detail}</Notice>
        <ButtonLink href="/login" size="lg" className="mt-5 w-full">
          Log in
        </ButtonLink>
      </AuthCard>
    );
  }

  if (state.status === "failed") {
    return (
      <AuthCard title="We couldn't verify your email">
        <Notice tone="danger">{state.message}</Notice>
        <Button
          size="lg"
          className="mt-5 w-full"
          onClick={() => {
            setState({ status: "verifying" });
            setAttempt((n) => n + 1);
          }}
        >
          Try again
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="This link is invalid or has expired"
      description="Verification links work for 3 days. Enter your email and we'll send you a new one."
    >
      <ResendVerificationForm />
    </AuthCard>
  );
}
