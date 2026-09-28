"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { authApi } from "@/lib/auth-api";
import { toFormErrors, type FormErrors } from "@/lib/form-errors";
import { AuthCard, textLink } from "./auth-shell";

const NO_ERRORS: FormErrors<"email"> = { fields: {}, form: null };

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState(NO_ERRORS);
  const [sent, setSent] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) {
      setErrors({ fields: { email: "Enter your email." }, form: null });
      return;
    }
    setPending(true);
    setErrors(NO_ERRORS);
    try {
      // Always 200 with the same message: never reveals whether the account exists.
      const { detail } = await authApi.requestPasswordReset(email);
      setSent(detail);
    } catch (error) {
      setErrors(toFormErrors(error, ["email"] as const));
    } finally {
      setPending(false);
    }
  }

  const backToLogin = (
    <Link href="/login" className={textLink}>
      Back to log in
    </Link>
  );

  if (sent) {
    return (
      <AuthCard
        title="Check your inbox"
        description="The link works for 1 hour and can be used once. If it doesn't arrive in a few minutes, check your spam folder."
        footer={backToLogin}
      >
        <Notice tone="success">{sent}</Notice>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Reset your password"
      description="Enter the email you signed up with and we'll send you a link to set a new password."
      footer={backToLogin}
    >
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
        {errors.form && <Notice tone="danger">{errors.form}</Notice>}
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? "Sending…" : "Send reset link"}
        </Button>
      </form>
    </AuthCard>
  );
}
