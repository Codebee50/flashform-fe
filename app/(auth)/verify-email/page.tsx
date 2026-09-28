import type { Metadata } from "next";
import { VerifyEmail } from "@/components/auth/verify-email";
import { firstParam } from "@/lib/search-params";

export const metadata: Metadata = { title: "Verify email" };

export default async function VerifyEmailPage({ searchParams }: PageProps<"/verify-email">) {
  const { token } = await searchParams;
  const value = firstParam(token);
  // key: a new link opened in the same tab starts over.
  return <VerifyEmail key={value ?? ""} token={value} />;
}
