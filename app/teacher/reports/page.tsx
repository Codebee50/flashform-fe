import type { Metadata } from "next";
import { ReportsView } from "@/components/reports/reports-view";
import { firstParam } from "@/lib/search-params";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage({ searchParams }: PageProps<"/teacher/reports">) {
  const room = firstParam((await searchParams).room);
  // Reports load in the browser: the teacher's tokens live in localStorage.
  return <ReportsView roomId={room && /^\d+$/.test(room) ? Number(room) : null} />;
}
