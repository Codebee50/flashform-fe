import type { Metadata } from "next";
import { QuizEditor } from "@/components/quizzes/quiz-editor";

export const metadata: Metadata = { title: "New quiz" };

export default function NewQuizPage() {
  return <QuizEditor id={null} />;
}
