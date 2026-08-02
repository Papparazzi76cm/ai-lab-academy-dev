import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  HelpCircle,
  Plus,
  Search,
  Filter,
  Edit,
  Eye,
  Copy,
  Archive,
  Trash2,
  BarChart2,
  CheckCircle2,
  Clock,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { fetchQuizzes, deleteQuiz, duplicateQuiz, updateQuiz } from "@/lib/quiz/api";
import { Quiz, QuizStatus } from "@/lib/quiz/types";

export function QuizList() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: quizzes = [], isLoading } = useQuery({
    queryKey: ["quizzes"],
    queryFn: () => fetchQuizzes(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteQuiz(id),
    onSuccess: () => {
      toast.success("Cuestionario eliminado con éxito");
      queryClient.invalidateQueries({ queryKey: ["quizzes"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => duplicateQuiz(id),
    onSuccess: (newQuiz) => {
      toast.success(`Duplicado creado: "${newQuiz.title}"`);
      queryClient.invalidateQueries({ queryKey: ["quizzes"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: QuizStatus }) => updateQuiz(id, { status }),
    onSuccess: () => {
      toast.success("Estado actualizado");
      queryClient.invalidateQueries({ queryKey: ["quizzes"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const filtered = quizzes.filter((q) => {
    const matchesSearch = q.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || q.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: QuizStatus) => {
    switch (status) {
      case "published":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
            Publicado
          </Badge>
        );
      case "archived":
        return (
          <Badge variant="outline" className="text-muted-foreground">
            Archivado
          </Badge>
        );
      case "draft":
      default:
        return <Badge variant="secondary">Borrador</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Cuestionarios</h2>
          <p className="text-sm text-muted-foreground">
            Crea, edita y gestiona la evaluación continua de tus lecciones y cursos.
          </p>
        </div>
        <Button asChild id="create-quiz-btn">
          <Link to="/admin/quizzes/$quizId" params={{ quizId: "new" }}>
            <Plus className="mr-2 size-4" />
            Nuevo Cuestionario
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="published">Publicados</SelectItem>
              <SelectItem value="draft">Borradores</SelectItem>
              <SelectItem value="archived">Archivados</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          Cargando cuestionarios...
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed py-12 text-center">
          <CardContent className="flex flex-col items-center justify-center space-y-3">
            <HelpCircle className="size-10 text-muted-foreground/60" />
            <div className="space-y-1">
              <h3 className="text-base font-semibold">No se encontraron cuestionarios</h3>
              <p className="text-sm text-muted-foreground">
                {searchTerm || statusFilter !== "all"
                  ? "Intenta cambiar los filtros de búsqueda."
                  : "Comienza creando tu primer cuestionario para evaluar a los estudiantes."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((quiz) => (
            <Card
              key={quiz.id}
              className="flex flex-col justify-between transition-all hover:border-primary/50"
            >
              <CardHeader className="space-y-2 pb-3">
                <div className="flex items-center justify-between gap-2">
                  {getStatusBadge(quiz.status)}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8">
                        <span className="sr-only">Abrir menú</span>
                        •••
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to="/admin/quizzes/$quizId" params={{ quizId: quiz.id }}>
                          <Edit className="mr-2 size-4" /> Editar
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/admin/quizzes/$quizId/results" params={{ quizId: quiz.id }}>
                          <BarChart2 className="mr-2 size-4" /> Resultados
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => duplicateMutation.mutate(quiz.id)}>
                        <Copy className="mr-2 size-4" /> Duplicar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {quiz.status !== "archived" && (
                        <DropdownMenuItem
                          onClick={() => statusMutation.mutate({ id: quiz.id, status: "archived" })}
                        >
                          <Archive className="mr-2 size-4" /> Archivar
                        </DropdownMenuItem>
                      )}
                      {quiz.status === "draft" && (
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => {
                            if (confirm("¿Estás seguro de eliminar este borrador?")) {
                              deleteMutation.mutate(quiz.id);
                            }
                          }}
                        >
                          <Trash2 className="mr-2 size-4" /> Eliminar
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <CardTitle className="line-clamp-1 text-base font-semibold">{quiz.title}</CardTitle>
                {quiz.description && (
                  <CardDescription className="line-clamp-2 text-xs">
                    {quiz.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-3 pt-0 text-xs text-muted-foreground">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="size-3.5 text-primary" /> Pass: {quiz.passing_score}%
                  </span>
                  {quiz.time_limit_minutes && (
                    <span className="flex items-center gap-1">
                      <Clock className="size-3.5" /> {quiz.time_limit_minutes} min
                    </span>
                  )}
                  {quiz.required_for_completion && (
                    <Badge
                      variant="outline"
                      className="text-[10px] uppercase tracking-wider text-amber-600"
                    >
                      Obligatorio
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between border-t border-border/60 pt-3">
                  <Button variant="outline" size="sm" className="w-full text-xs" asChild>
                    <Link to="/admin/quizzes/$quizId" params={{ quizId: quiz.id }}>
                      Gestionar Preguntas
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
