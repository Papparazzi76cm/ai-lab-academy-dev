import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Send } from "lucide-react";

interface QuizSubmitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unansweredCount: number;
  totalQuestions: number;
  onConfirmSubmit: () => void;
  isSubmitting?: boolean;
}

export function QuizSubmitDialog({
  open,
  onOpenChange,
  unansweredCount,
  totalQuestions,
  onConfirmSubmit,
  isSubmitting,
}: QuizSubmitDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {unansweredCount > 0 && <AlertTriangle className="size-5 text-amber-500" />}
            ¿Confirmar envío del cuestionario?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            {unansweredCount > 0 ? (
              <span className="block font-semibold text-amber-600 dark:text-amber-400">
                Atención: Te quedan {unansweredCount} de {totalQuestions} pregunta
                {unansweredCount !== 1 ? "s" : ""} sin responder.
              </span>
            ) : (
              <span>Has respondido todas las preguntas.</span>
            )}
            <span className="block">
              Una vez enviado, tus respuestas serán corregidas automáticamente y no podrás modificar
              este intento.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Revisar Respuestas</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirmSubmit}
            disabled={isSubmitting}
            className="bg-primary"
            id="confirm-submit-quiz-btn"
          >
            {isSubmitting ? "Enviando..." : "Confirmar y Enviar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
