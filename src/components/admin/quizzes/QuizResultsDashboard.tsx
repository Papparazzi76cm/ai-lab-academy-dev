import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Users, CheckCircle, Clock, Award, BarChart3, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getQuizStatisticsRpc } from "@/lib/quiz/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

export function QuizResultsDashboard({ quizId }: { quizId: string }) {
  const {
    data: stats,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["quiz-stats", quizId],
    queryFn: () => getQuizStatisticsRpc(quizId),
  });

  if (isLoading) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Cargando estadísticas...
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="py-12 text-center text-sm text-destructive">
        Error al cargar estadísticas: {error?.message || "No se encontraron datos."}
      </div>
    );
  }

  const chartData = [
    { range: "0 - 20%", count: stats.score_distribution.range_0_20 || 0, color: "#ef4444" },
    { range: "21 - 40%", count: stats.score_distribution.range_21_40 || 0, color: "#f97316" },
    { range: "41 - 60%", count: stats.score_distribution.range_41_60 || 0, color: "#eab308" },
    { range: "61 - 80%", count: stats.score_distribution.range_81_100 || 0, color: "#3b82f6" },
    { range: "81 - 100%", count: stats.score_distribution.range_81_100 || 0, color: "#10b981" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b pb-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/admin/quizzes">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Resultados del Cuestionario</h2>
          <p className="text-sm text-muted-foreground">
            Métricas de rendimiento y listado de intentos de {stats.quiz_title}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Estudiantes</CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_students}</div>
            <p className="text-xs text-muted-foreground mt-1">Alumnos que han participado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Intentos Totales
            </CardTitle>
            <Clock className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.attempts_started}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.attempts_completed} completados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tasa de Aprobación
            </CardTitle>
            <CheckCircle className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {stats.pass_rate}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.passed_attempts} intentos aprobados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Puntuación Promedio
            </CardTitle>
            <TrendingUp className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avg_score}%</div>
            <p className="text-xs text-muted-foreground mt-1">Media global de los alumnos</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="size-5 text-primary" /> Distribución de Calificaciones
          </CardTitle>
          <CardDescription>Conteo de intentos por rangos de nota obtenida.</CardDescription>
        </CardHeader>
        <CardContent className="h-64 pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
              <XAxis dataKey="range" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => [`${value} intentos`, "Cantidad"]} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Intentos por Estudiante</CardTitle>
          <CardDescription>Detalle de cada entrega y su resultado correspondiente.</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.student_attempts.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Aún no hay intentos registrados para este cuestionario.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estudiante</TableHead>
                  <TableHead>Intento N.º</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Puntuación</TableHead>
                  <TableHead>Resultado</TableHead>
                  <TableHead className="text-right">Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.student_attempts.map((att) => (
                  <TableRow key={att.id}>
                    <TableCell className="font-medium text-sm">
                      {att.user_email || `Usuario ${att.user_id.slice(0, 8)}`}
                    </TableCell>
                    <TableCell>#{att.attempt_number}</TableCell>
                    <TableCell>
                      <Badge variant={att.status === "submitted" ? "default" : "secondary"}>
                        {att.status === "submitted"
                          ? "Enviado"
                          : att.status === "expired"
                            ? "Expirado"
                            : "En curso"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-bold text-sm">{att.score}%</TableCell>
                    <TableCell>
                      {att.status === "submitted" && (
                        <Badge
                          className={
                            att.passed
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                              : "bg-destructive/10 text-destructive border-destructive/20"
                          }
                        >
                          {att.passed ? "Aprobado" : "Reprobado"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {att.submitted_at
                        ? new Date(att.submitted_at).toLocaleString("es-ES")
                        : new Date(att.started_at).toLocaleString("es-ES")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
