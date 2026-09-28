"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { authApi } from "@/lib/auth-api";
import { toFormErrors, type FormErrors } from "@/lib/form-errors";
import { AuthCard, textLink } from "./auth-shell";
import { useAuth } from "./auth-provider";
import { ResendVerificationButton } from "./resend-verification";

const FIELDS = ["name", "email", "password"] as const;
type FieldName = (typeof FIELDS)[number];

const NO_ERRORS: FormErrors<FieldName> = { fields: {}, form: null };
const MIN_PASSWORD = 8;

export function RegisterForm() {
  const router = useRouter();
  const auth = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState(NO_ERRORS);
  const [registered, setRegistered] = useState<{ email: string; detail: string } | null>(null);

  useEffect(() => {
    if (auth.status === "authenticated") router.replace("/teacher");
  }, [auth.status, router]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const missing: FormErrors<FieldName>["fields"] = {};
    if (!name.trim()) missing.name = "Enter your name.";
    if (!email.trim()) missing.email = "Enter your email.";
    if (password.length < MIN_PASSWORD) {
      missing.password = `Use at least ${MIN_PASSWORD} characters.`;
    }
    if (Object.keys(missing).length) {
      setErrors({ fields: missing, form: null });
      return;
    }

    setPending(true);
    setErrors(NO_ERRORS);
    try {
      // 201 returns no tokens: the teacher has to verify their email, then log in.
      const { user, detail } = await authApi.register({ name: name.trim(), email, password });
      setRegistered({ email: user.email, detail });
    } catch (error) {
      setErrors(toFormErrors(error, FIELDS));
    } finally {
      setPending(false);
    }
  }

  if (registered) {
    return (
      <AuthCard
        title="Check your inbox"
        description={
          <>
            We sent a verification link to{" "}
            <span className="font-medium break-all text-text">{registered.email}</span>. Open it
            to finish setting up your account. The link works for 3 days.
          </>
        }
        footer={
          <>
            Wrong email?{" "}
            <button
              type="button"
              className={textLink}
              onClick={() => {
                setRegistered(null);
                setPassword("");
              }}
            >
              Start over
            </button>
          </>
        }
      >
        <Notice tone="success">{registered.detail}</Notice>
        <div className="mt-5 space-y-3">
          <ButtonLink href="/login" size="lg" className="w-full">
            Go to log in
          </ButtonLink>
          <p className="pt-2 text-body text-text-muted">Didn&apos;t get the email?</p>
          <ResendVerificationButton email={registered.email} />
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Create your teacher account"
      description="Free for you and your students. No card, no trial."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className={textLink}>
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Field
          label="Name"
          name="name"
          autoComplete="name"
          maxLength={150}
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={errors.fields.name}
          required
        />
        <Field
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          maxLength={150}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={errors.fields.email}
          required
        />
        <Field
          label="Password"
          type="password"
          name="password"
          autoComplete="new-password"
          maxLength={128}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={errors.fields.password}
          hint={`At least ${MIN_PASSWORD} characters.`}
          required
        />

        {errors.form && <Notice tone="danger">{errors.form}</Notice>}

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </AuthCard>
  );
}
