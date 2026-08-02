import { createFileRoute } from "@tanstack/react-router";
import { QuizEditor } from "@/components/admin/quizzes/QuizEditor";

export const Route = createFileRoute("/admin/quizzes/$quizId")({
  component: AdminQuizEditorPage,
});

function AdminQuizEditorPage() {
  const { quizId } = Route.useParams();
  return <QuizEditor quizId={quizId} />;
}
