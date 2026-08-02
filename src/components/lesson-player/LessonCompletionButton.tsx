import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LessonCompletionButtonProps {
  isCompleted: boolean;
  onToggle: () => Promise<unknown>;
}

export function LessonCompletionButton({ isCompleted, onToggle }: LessonCompletionButtonProps) {
  const [isPending, setIsPending] = useState(false);

  const handleClick = async () => {
    if (isPending) return;
    setIsPending(true);
    try {
      await onToggle();
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Button
      variant={isCompleted ? "secondary" : "default"}
      onClick={handleClick}
      disabled={isPending}
      className="w-full font-medium sm:w-auto"
      aria-label={
        isCompleted ? "Marcar lección como no completada" : "Marcar lección como completada"
      }
    >
      {isPending ? (
        <Loader2 className="mr-2 size-4 animate-spin text-muted-foreground" />
      ) : (
        <CheckCircle2
          className={cn(
            "mr-2 size-4",
            isCompleted ? "text-emerald-500" : "text-primary-foreground",
          )}
        />
      )}
      <span>{isCompleted ? "Completada (Cambiar)" : "Marcar como completada"}</span>
    </Button>
  );
}
