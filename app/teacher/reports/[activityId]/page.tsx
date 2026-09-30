import type { Metadata } from "next";
import { ReportDetail } from "@/components/reports/report-detail";

export const metadata: Metadata = { title: "Report" };

export default async function ReportPage({
  params,
}: PageProps<"/teacher/reports/[activityId]">) {
  const { activityId } = await params;
  // Reports load in the browser: the teacher's tokens live in localStorage.
  return <ReportDetail key={activityId} id={activityId} />;
}
