import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  MoreVertical,
  Copy,
  Trash2,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Settings,
} from "lucide-react";

export function BlockContextMenu({
  isExpanded,
  onToggleExpand,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onOpenSettings,
  isFirst,
  isLast,
}: {
  isExpanded: boolean;
  onToggleExpand: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onOpenSettings?: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-7 text-muted-foreground hover:text-foreground"
          aria-label="Opciones del bloque"
        >
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={onToggleExpand} className="gap-2">
          {isExpanded ? (
            <>
              <ChevronUp className="size-4 text-muted-foreground" />
              <span>Colapsar bloque</span>
            </>
          ) : (
            <>
              <ChevronRight className="size-4 text-muted-foreground" />
              <span>Expandir bloque</span>
            </>
          )}
        </DropdownMenuItem>

        <DropdownMenuItem onClick={onDuplicate} className="gap-2">
          <Copy className="size-4 text-muted-foreground" />
          <span>Duplicar bloque</span>
        </DropdownMenuItem>

        {onOpenSettings && (
          <DropdownMenuItem onClick={onOpenSettings} className="gap-2">
            <Settings className="size-4 text-muted-foreground" />
            <span>Ajustes del bloque</span>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem disabled={isFirst} onClick={onMoveUp} className="gap-2">
          <ChevronUp className="size-4 text-muted-foreground" />
          <span>Mover arriba</span>
        </DropdownMenuItem>

        <DropdownMenuItem disabled={isLast} onClick={onMoveDown} className="gap-2">
          <ChevronDown className="size-4 text-muted-foreground" />
          <span>Mover abajo</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={onDelete}
          className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
        >
          <Trash2 className="size-4" />
          <span>Eliminar bloque</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
