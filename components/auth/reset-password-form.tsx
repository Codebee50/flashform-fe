"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { ApiError } from "@/lib/api";
import { authApi } from "@/lib/auth-api";
import { clearTokens } from "@/lib/auth-tokens";
import { toFormErrors, type FormErrors } from "@/lib/form-errors";
import { AuthCard } from "./auth-shell";

const FIELDS = ["new_password", "confirm"] as const;
type FieldName = (typeof FIELDS)[number];

const NO_ERRORS: FormErrors<FieldName> = { fields: {}, form: null };
const MIN_PASSWORD = 8;

function InvalidLink() {
  return (
    <AuthCard
      title="This link is invalid or has expired"
      description="Reset links work for 1 hour and only once. Ask for a new one and we'll email it to you."
    >
      <ButtonLink href="/forgot-password" size="lg" className="w-full">
        Get a new link
      </ButtonLink>
    </AuthCard>
  );
}

export function ResetPasswordForm({ uid, token }: { uid: string | null; token: string | null }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState(NO_ERRORS);
  const [invalid, setInvalid] = useState(!uid || !token);

  if (invalid || !uid || !token) return <InvalidLink />;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!uid || !token) return;
    const problems: FormErrors<FieldName>["fields"] = {};
    if (password.length < MIN_PASSWORD) {
      problems.new_password = `Use at least ${MIN_PASSWORD} characters.`;
    }
    if (confirm !== password) problems.confirm = "The passwords don't match.";
    if (Object.keys(problems).length) {
      setErrors({ fields: problems, form: null });
      return;
    }

    setPending(true);
    setErrors(NO_ERRORS);
    try {
      await authApi.confirmPasswordReset({ uid, token, new_password: password });
      // The reset revoked every refresh token, including any this browser holds.
      clearTokens();
      router.replace("/login?reset=1");
    } catch (error) {
      if (error instanceof ApiError && error.code === "invalid_or_expired_token") {
        setInvalid(true);
      } else {
        // A rejected password doesn't use up the link: the teacher can try another.
        setErrors(toFormErrors(error, FIELDS));
      }
      setPending(false);
    }
  }

  return (
    <AuthCard title="Set a new password" description="You'll use it to log in from now on.">
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Field
          label="New password"
          type="password"
          name="new_password"
          autoComplete="new-password"
          maxLength={128}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={errors.fields.new_password}
          hint={`At least ${MIN_PASSWORD} characters.`}
          required
        />
        <Field
          label="Confirm new password"
          type="password"
          name="confirm"
          autoComplete="new-password"
          maxLength={128}
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          error={errors.fields.confirm}
          required
        />
        {errors.form && <Notice tone="danger">{errors.form}</Notice>}
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? "Saving…" : "Set new password"}
        </Button>
      </form>
    </AuthCard>
  );
}
