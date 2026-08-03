import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Loader2 } from "lucide-react";

interface RevokeCertificateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  isPending?: boolean;
}

export function RevokeCertificateDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending = false,
}: RevokeCertificateDialogProps) {
  const [reason, setReason] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    onConfirm(reason.trim());
    setReason("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent id="dialog-revoke-cert" className="sm:max-w-md">
        <DialogHeader>
          <div className="flex size-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive mb-2">
            <AlertTriangle className="size-5" />
          </div>
          <DialogTitle className="font-display text-lg">Revocar Certificado</DialogTitle>
          <DialogDescription className="text-xs">
            Esta acción marcará el certificado como revocado de forma permanente. La página pública
            seguirá indicando que la credencial fue revocada.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="revoke-reason" className="text-xs font-medium">
              Motivo de la revocación <span className="text-destructive">*</span>
            </Label>
            <Input
              id="revoke-reason"
              placeholder="Ej. Incumplimiento de requisitos académicos..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              minLength={5}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              id="btn-confirm-revoke"
              type="submit"
              variant="destructive"
              size="sm"
              disabled={!reason.trim() || isPending}
              className="gap-2"
            >
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Revocar Certificado
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
