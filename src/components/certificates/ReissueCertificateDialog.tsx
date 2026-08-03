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
import { RefreshCw, Loader2 } from "lucide-react";

interface ReissueCertificateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending?: boolean;
}

export function ReissueCertificateDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending = false,
}: ReissueCertificateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent id="dialog-reissue-cert" className="sm:max-w-md">
        <DialogHeader>
          <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 mb-2">
            <RefreshCw className="size-5" />
          </div>
          <DialogTitle className="font-display text-lg">Reemitir Credencial</DialogTitle>
          <DialogDescription className="text-xs">
            Se marcará la credencial anterior como reemplazada y se generará una nueva credencial
            con número e identificador únicos e inmutables.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-0 mt-4">
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
            id="btn-confirm-reissue"
            type="button"
            variant="default"
            size="sm"
            onClick={onConfirm}
            disabled={isPending}
            className="gap-2"
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            Confirmar Reemisión
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
