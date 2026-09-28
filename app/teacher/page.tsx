import type { Metadata } from "next";
import { Dashboard } from "@/components/teacher/dashboard";

export const metadata: Metadata = { title: "Dashboard" };

export default function TeacherPage() {
  return <Dashboard />;
}
