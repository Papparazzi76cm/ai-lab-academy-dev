import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/auth/RouteGuard";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/lib/theme";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Configuración — NeuraLab" },
      {
        name: "description",
        content: "Ajusta tu perfil, objetivos de estudio y preferencias de la plataforma.",
      },
      { property: "og:title", content: "Configuración — NeuraLab" },
      { property: "og:description", content: "Preferencias de cuenta y aprendizaje." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <RequireAuth>
      <SettingsPageContent />
    </RequireAuth>
  );
}

function SettingsPageContent() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [goal, setGoal] = useState(20);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, bio, daily_goal_minutes")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setFullName(data.full_name ?? "");
        setBio(data.bio ?? "");
        setGoal(data.daily_goal_minutes);
      });
  }, [user]);

  async function save() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, bio, daily_goal_minutes: goal })
      .eq("id", user.id);
    setSaving(false);
    if (error) toast.error("No se pudo guardar");
    else toast.success("Cambios guardados");
  }

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-2xl px-5 py-14">
        <h1 className="font-display text-4xl font-bold tracking-tight">Configuración</h1>

        <div className="mt-8 space-y-6 rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="space-y-2">
            <Label htmlFor="full-name">Nombre completo</Label>
            <Input id="full-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">Biografía</Label>
            <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={4} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="goal">Objetivo diario (minutos)</Label>
            <Input
              id="goal"
              type="number"
              value={goal}
              onChange={(e) => setGoal(Number(e.target.value))}
            />
          </div>
          <div className="flex items-center justify-between border-t border-border pt-5">
            <Label htmlFor="theme">Modo oscuro</Label>
            <Switch id="theme" checked={theme === "dark"} onCheckedChange={toggleTheme} />
          </div>
          <Button onClick={save} disabled={!user || saving}>
            {saving ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
