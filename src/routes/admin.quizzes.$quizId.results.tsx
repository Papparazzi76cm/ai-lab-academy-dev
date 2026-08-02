import { createFileRoute } from "@tanstack/react-router";
import { QuizResultsDashboard } from "@/components/admin/quizzes/QuizResultsDashboard";

export const Route = createFileRoute("/admin/quizzes/$quizId/results")({
  component: AdminQuizResultsPage,
});

function AdminQuizResultsPage() {
  const { quizId } = Route.useParams();
  return <QuizResultsDashboard quizId={quizId} />;
}
