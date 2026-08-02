import { createFileRoute } from "@tanstack/react-router";
import { QuizList } from "@/components/admin/quizzes/QuizList";

export const Route = createFileRoute("/admin/quizzes/")({
  component: AdminQuizzesIndexPage,
});

function AdminQuizzesIndexPage() {
  return <QuizList />;
}
