"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { authApi } from "@/lib/auth-api";
import { toFormErrors } from "@/lib/form-errors";
import { useCooldown } from "@/lib/use-cooldown";

const COOLDOWN_SECONDS = 30;

type Result = { tone: "success" | "danger"; message: string; field?: string } | null;

function useResend() {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const [cooldown, startCooldown] = useCooldown();

  async function resend(email: string) {
    setPending(true);
    setResult(null);
    try {
      // Always 200 with the same message, whether or not the account exists.
      const { detail } = await authApi.resendVerification(email);
      setResult({ tone: "success", message: detail });
      startCooldown(COOLDOWN_SECONDS);
    } catch (error) {
      const { fields, form } = toFormErrors(error, ["email"] as const);
      setResult({ tone: "danger", message: form ?? "", field: fields.email });
    } finally {
      setPending(false);
    }
  }

  const label = pending
    ? "Sending…"
    : cooldown > 0
      ? `Resend in ${cooldown}s`
      : "Resend verification email";

  return { resend, pending, result, disabled: pending || cooldown > 0, label };
}

/** Resends to an email the teacher already typed (login form, "check your inbox"). */
export function ResendVerificationButton({ email }: { email: string }) {
  const { resend, result, disabled, label } = useResend();
  const message = result?.field ?? result?.message;

  return (
    <div>
      <Button
        variant="secondary"
        onClick={() => void resend(email)}
        disabled={disabled || !email.trim()}
        className="w-full"
      >
        {label}
      </Button>
      {message && (
        <Notice tone={result?.tone} className="mt-3">
          {message}
        </Notice>
      )}
    </div>
  );
}

/** Asks for the email first (an expired verification link). */
export function ResendVerificationForm() {
  const [email, setEmail] = useState("");
  const { resend, result, disabled, label } = useResend();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void resend(email);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Field
        label="Email"
        type="email"
        name="email"
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        error={result?.field}
        required
      />
      <Button type="submit" className="w-full" disabled={disabled || !email.trim()}>
        {label}
      </Button>
      {result && !result.field && result.message && (
        <Notice tone={result.tone}>{result.message}</Notice>
      )}
    </form>
  );
}
