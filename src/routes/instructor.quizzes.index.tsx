import { createFileRoute } from "@tanstack/react-router";
import { QuizList } from "@/components/admin/quizzes/QuizList";

export const Route = createFileRoute("/instructor/quizzes/")({
  component: InstructorQuizzesIndexPage,
});

function InstructorQuizzesIndexPage() {
  return <QuizList />;
}
