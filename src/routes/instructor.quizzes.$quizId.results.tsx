import { createFileRoute } from "@tanstack/react-router";
import { QuizResultsDashboard } from "@/components/admin/quizzes/QuizResultsDashboard";

export const Route = createFileRoute("/instructor/quizzes/$quizId/results")({
  component: InstructorQuizResultsPage,
});

function InstructorQuizResultsPage() {
  const { quizId } = Route.useParams();
  return <QuizResultsDashboard quizId={quizId} />;
}
