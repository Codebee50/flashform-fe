import type { Metadata } from "next";
import { StudentRoom } from "@/components/student/student-room";

export const metadata: Metadata = { title: "Room", robots: { index: false } };

export default async function StudentRoomPage({ params }: PageProps<"/r/[code]">) {
  const { code } = await params;
  // The student's identity lives in localStorage, so everything renders in the browser.
  return <StudentRoom key={code} code={code} />;
}
