import { createFileRoute, Link } from "@tanstack/react-router";
import { QuizPlayer } from "@/components/quiz-player/QuizPlayer";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/academy/quiz/$quizId")({
  head: () => ({
    meta: [
      { title: `Cuestionario — AI Lab Academy` },
      { name: "description", content: "Evaluación interactiva de la Academia." },
    ],
  }),
  component: StudentQuizPage,
});

function StudentQuizPage() {
  const { quizId } = Route.useParams();

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/dashboard">
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <h1 className="text-xl font-bold">Evaluación Interactiva</h1>
        </div>

        <QuizPlayer quizId={quizId} />
      </div>
    </PageShell>
  );
}
