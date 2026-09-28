import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import { firstParam } from "@/lib/search-params";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  return <LoginForm next={firstParam(params.next)} reset={firstParam(params.reset) === "1"} />;
}
