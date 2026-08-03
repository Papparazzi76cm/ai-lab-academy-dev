import React, { useState } from "react";
import type { BlockType, BlockCategory, BlockDefinition } from "../types";
import { BlockRegistry } from "../blocks/registry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Heading,
  Pilcrow,
  Image,
  Video,
  Code,
  Quote,
  Info,
  Minus,
  MousePointerClick,
  CheckSquare,
  ListCollapse,
  FolderKanban,
  Images,
  FileDown,
  Globe,
  HelpCircle,
  Award,
  Maximize2,
  Search,
  Plus,
} from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Heading,
  Pilcrow,
  Image,
  Video,
  Code,
  Quote,
  Info,
  Minus,
  MousePointerClick,
  CheckSquare,
  ListCollapse,
  FolderKanban,
  Images,
  FileDown,
  Globe,
  HelpCircle,
  Award,
  Maximize2,
};

interface BlockToolbarProps {
  open: boolean;
  onClose: () => void;
  onAddBlock: (type: BlockType) => void;
}

export function BlockToolbar({ open, onClose, onAddBlock }: BlockToolbarProps) {
  const [selectedCategory, setSelectedCategory] = useState<BlockCategory | "all">("all");
  const [search, setSearch] = useState("");

  const allDefinitions = BlockRegistry.getAll();

  const filtered = allDefinitions.filter((def) => {
    const matchesCat = selectedCategory === "all" || def.category === selectedCategory;
    const matchesSearch =
      def.name.toLowerCase().includes(search.toLowerCase()) ||
      def.description.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleSelect = (type: BlockType) => {
    onAddBlock(type);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader>
          <DialogTitle className="font-display text-lg flex items-center gap-2">
            <Plus className="size-5 text-primary" /> Catálogo de Bloques de Contenido
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 my-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar bloque por nombre o función..."
              className="pl-9"
            />
          </div>

          <div className="flex gap-1 overflow-x-auto pb-1">
            <Button
              variant={selectedCategory === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory("all")}
              className="text-xs"
            >
              Todos ({allDefinitions.length})
            </Button>
            <Button
              variant={selectedCategory === "text" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory("text")}
              className="text-xs"
            >
              Texto
            </Button>
            <Button
              variant={selectedCategory === "media" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory("media")}
              className="text-xs"
            >
              Multimedia
            </Button>
            <Button
              variant={selectedCategory === "interactive" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory("interactive")}
              className="text-xs"
            >
              Interactivos
            </Button>
            <Button
              variant={selectedCategory === "education" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory("education")}
              className="text-xs"
            >
              Evaluación / Certificado
            </Button>
            <Button
              variant={selectedCategory === "advanced" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory("advanced")}
              className="text-xs"
            >
              Avanzado
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto pr-1 py-2 flex-1">
          {filtered.map((def) => {
            const IconComponent = ICON_MAP[def.iconName] || Heading;
            return (
              <button
                key={def.type}
                onClick={() => handleSelect(def.type)}
                className="flex items-start gap-3 p-3 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 text-left transition-all group cursor-pointer"
              >
                <div className="p-2.5 rounded-lg bg-muted group-hover:bg-primary/10 group-hover:text-primary transition-colors shrink-0">
                  <IconComponent className="size-5" />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <h4 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                    {def.name}
                  </h4>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-snug">
                    {def.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
