import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { firstParam } from "@/lib/search-params";

export const metadata: Metadata = { title: "Set a new password" };

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const params = await searchParams;
  const uid = firstParam(params.uid);
  const token = firstParam(params.token);
  return <ResetPasswordForm key={`${uid}:${token}`} uid={uid} token={token} />;
}
