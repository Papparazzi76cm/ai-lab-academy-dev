import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { blockCatalog, blockCategories, type BlockCategory, type BlockType } from "@/lib/blocks";
import {
  Search,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  List,
  ListOrdered,
  Quote,
  Minus,
  Image,
  Youtube,
  Video,
  FileVideo,
  AudioLines,
  Images,
  Code,
  Download,
  ExternalLink,
  FileText,
  Target,
  BookOpen,
  Lightbulb,
  AlertTriangle,
  Dumbbell,
  Trophy,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  List,
  ListOrdered,
  Quote,
  Minus,
  Image,
  Youtube,
  Video,
  FileVideo,
  AudioLines,
  Images,
  Code,
  Download,
  ExternalLink,
  FileText,
  Target,
  BookOpen,
  Lightbulb,
  AlertTriangle,
  Dumbbell,
  Trophy,
  HelpCircle,
};

export function BlockSelector({
  open,
  onOpenChange,
  onSelectBlock,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectBlock: (type: BlockType) => void;
}) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const filteredCatalog = blockCatalog.filter((item) => {
    const matchesSearch =
      item.label.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === "all" || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6 gap-4">
        <DialogHeader>
          <DialogTitle className="text-xl font-display font-semibold">
            Insertar nuevo bloque
          </DialogTitle>
        </DialogHeader>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar bloque (p. ej. código, vídeo, ejercicio, resumen)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10"
            autoFocus
          />
        </div>

        {/* Category Filter Tabs */}
        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
          <TabsList className="w-full flex justify-start overflow-x-auto gap-1 bg-muted/50 p-1">
            <TabsTrigger value="all" className="text-xs px-3 py-1">
              Todos ({blockCatalog.length})
            </TabsTrigger>
            {blockCategories.map((cat) => (
              <TabsTrigger key={cat.id} value={cat.id} className="text-xs px-3 py-1 capitalize">
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Catalog Grid */}
        <div className="flex-1 overflow-y-auto pr-1">
          {filteredCatalog.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No se encontraron bloques para &quot;{search}&quot;.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {filteredCatalog.map((item) => {
                const IconComponent = iconMap[item.iconName] || AlignLeft;
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => {
                      onSelectBlock(item.type);
                      onOpenChange(false);
                      setSearch("");
                    }}
                    className="flex items-start gap-3 rounded-xl border border-border p-3 text-left transition-all hover:border-primary/50 hover:bg-accent/50 hover:shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <IconComponent className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-sm font-medium text-foreground truncate">
                          {item.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">
                          {item.category}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {item.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
