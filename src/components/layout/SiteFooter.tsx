import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-xl bg-gradient-brand">
              <Sparkles className="size-4 text-primary-foreground" />
            </span>
            <span className="font-display text-lg font-semibold">NeuraLab</span>
          </div>
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">
            La academia para aprender inteligencia artificial desde cero, con claridad y práctica
            real.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold">Plataforma</h3>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/courses" className="hover:text-foreground">
                Catálogo
              </Link>
            </li>
            <li>
              <Link to="/ai-lab" className="hover:text-foreground">
                Laboratorio IA
              </Link>
            </li>
            <li>
              <Link to="/dashboard" className="hover:text-foreground">
                Mi aprendizaje
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold">Cuenta</h3>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/login" className="hover:text-foreground">
                Iniciar sesión
              </Link>
            </li>
            <li>
              <Link to="/register" className="hover:text-foreground">
                Crear cuenta
              </Link>
            </li>
            <li>
              <Link to="/forgot-password" className="hover:text-foreground">
                Recuperar contraseña
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold">Legal</h3>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>Aviso legal</li>
            <li>Privacidad</li>
            <li>Cookies</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} NeuraLab. Todos los derechos reservados.
      </div>
    </footer>
  );
}
