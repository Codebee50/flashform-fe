import { TeacherGate } from "@/components/teacher/teacher-gate";

// Tokens live in localStorage, so the auth check runs in the browser (see TeacherGate).
export default function TeacherLayout({ children }: LayoutProps<"/teacher">) {
  return <TeacherGate>{children}</TeacherGate>;
}
