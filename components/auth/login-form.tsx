"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { ApiError } from "@/lib/api";
import { toFormErrors, type FormErrors } from "@/lib/form-errors";
import { AuthCard, textLink } from "./auth-shell";
import { safeNextPath, useAuth } from "./auth-provider";
import { ResendVerificationButton } from "./resend-verification";

const FIELDS = ["email", "password"] as const;
type FieldName = (typeof FIELDS)[number];

const NO_ERRORS: FormErrors<FieldName> = { fields: {}, form: null };

export function LoginForm({ next, reset }: { next: string | null; reset: boolean }) {
  const router = useRouter();
  const auth = useAuth();
  const destination = safeNextPath(next);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState(NO_ERRORS);
  // The email that got 403 email_not_verified, so the resend button targets it.
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);

  // Already logged in (or just logged in): go straight to the teacher pages.
  useEffect(() => {
    if (auth.status === "authenticated") router.replace(destination);
  }, [auth.status, destination, router]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const missing: FormErrors<FieldName>["fields"] = {};
    if (!email.trim()) missing.email = "Enter your email.";
    if (!password) missing.password = "Enter your password.";
    setUnverifiedEmail(null);
    if (Object.keys(missing).length) {
      setErrors({ fields: missing, form: null });
      return;
    }

    setPending(true);
    setErrors(NO_ERRORS);
    try {
      await auth.login(email, password);
      // The effect above redirects once the auth state updates.
    } catch (error) {
      if (error instanceof ApiError && error.code === "email_not_verified") {
        setUnverifiedEmail(email);
      } else if (error instanceof ApiError && error.code === "invalid_credentials") {
        setErrors({ fields: {}, form: "Invalid email or password." });
      } else {
        setErrors(toFormErrors(error, FIELDS));
      }
      setPending(false);
    }
  }

  return (
    <AuthCard
      title="Log in"
      description="Welcome back. Log in to run your class."
      footer={
        <>
          New to Flashform?{" "}
          <Link href="/register" className={textLink}>
            Create an account
          </Link>
        </>
      }
    >
      {reset && (
        <Notice tone="success" className="mb-5">
          Your password has been reset. You can now log in.
        </Notice>
      )}

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Field
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={errors.fields.email}
          required
        />
        <Field
          label="Password"
          type="password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={errors.fields.password}
          required
          labelAction={
            <Link href="/forgot-password" className={`text-label ${textLink}`}>
              Forgot password?
            </Link>
          }
        />

        {errors.form && <Notice tone="danger">{errors.form}</Notice>}

        {unverifiedEmail !== null && (
          <div className="space-y-3">
            <Notice tone="info">
              Please verify your email before logging in. Check your inbox for the link we sent to{" "}
              <span className="font-medium break-all">{unverifiedEmail}</span>.
            </Notice>
            <ResendVerificationButton email={unverifiedEmail} />
          </div>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? "Logging in…" : "Log in"}
        </Button>
      </form>
    </AuthCard>
  );
}
