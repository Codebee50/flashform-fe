import type { Metadata } from "next";
import { QuizEditor } from "@/components/quizzes/quiz-editor";

export const metadata: Metadata = { title: "Edit quiz" };

export default async function QuizPage({ params }: PageProps<"/teacher/quizzes/[id]">) {
  const { id } = await params;
  // Quizzes load in the browser: the teacher's tokens live in localStorage.
  return <QuizEditor key={id} id={id} />;
}
