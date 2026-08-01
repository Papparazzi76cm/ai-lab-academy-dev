import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Enums, Tables } from "@/integrations/supabase/types";

export type AppRole = Enums<"app_role">;
export type Profile = Tables<"profiles">;

export type AuthResult = { error: string | null };
export type SignUpResult = AuthResult & { needsEmailConfirmation: boolean };

/** Traduce los errores de autenticación a mensajes comprensibles en español. */
export function authErrorMessage(message: string | undefined): string {
  if (!message) return "Ha ocurrido un error inesperado. Inténtalo de nuevo.";
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Email o contraseña incorrectos.";
  if (m.includes("email not confirmed")) return "Debes confirmar tu correo antes de entrar.";
  if (m.includes("user already registered")) return "Ya existe una cuenta con este email.";
  if (m.includes("password should be at least"))
    return "La contraseña debe tener al menos 6 caracteres.";
  if (m.includes("unable to validate email") || m.includes("invalid email"))
    return "El email no es válido.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.";
  if (m.includes("network") || m.includes("fetch"))
    return "Problema de conexión. Revisa tu red e inténtalo de nuevo.";
  return "No hemos podido completar la operación. Inténtalo de nuevo.";
}

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  /** True while the initial session is being resolved. */
  loading: boolean;
  /** True while profile and roles are being resolved for the current session. */
  profileLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isInstructor: boolean;
  hasRole: (role: AppRole) => boolean;
  hasAnyRole: (roles: AppRole[]) => boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string, fullName: string) => Promise<SignUpResult>;
  resetPassword: (email: string) => Promise<AuthResult>;
  updatePassword: (password: string) => Promise<AuthResult>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  profile: null,
  roles: [],
  loading: true,
  profileLoading: false,
  isAuthenticated: false,
  isAdmin: false,
  isInstructor: false,
  hasRole: () => false,
  hasAnyRole: () => false,
  signIn: async () => ({ error: "Auth no disponible." }),
  signUp: async () => ({ error: "Auth no disponible.", needsEmailConfirmation: false }),
  resetPassword: async () => ({ error: "Auth no disponible." }),
  updatePassword: async () => ({ error: "Auth no disponible." }),
  refreshProfile: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const userId = session?.user?.id;

  const loadProfileAndRoles = useCallback(async (id: string) => {
    setProfileLoading(true);
    const [profileResult, rolesResult] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", id),
    ]);
    setProfile(profileResult.data ?? null);
    setRoles((rolesResult.data ?? []).map((r) => r.role));
    setProfileLoading(false);
  }, []);

  // El perfil y el rol inicial los crea el trigger `handle_new_user` en el alta.
  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setRoles([]);
      setProfileLoading(false);
      return;
    }
    let active = true;
    setProfileLoading(true);
    void (async () => {
      const [profileResult, rolesResult] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId),
      ]);
      if (!active) return;
      setProfile(profileResult.data ?? null);
      setRoles((rolesResult.data ?? []).map((r) => r.role));
      setProfileLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [userId]);

  const hasRole = useCallback((role: AppRole) => roles.includes(role), [roles]);
  const hasAnyRole = useCallback(
    (wanted: AppRole[]) => wanted.some((role) => roles.includes(role)),
    [roles],
  );

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? authErrorMessage(error.message) : null };
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, fullName: string): Promise<SignUpResult> => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: { full_name: fullName },
        },
      });
      if (error) {
        return { error: authErrorMessage(error.message), needsEmailConfirmation: false };
      }
      return { error: null, needsEmailConfirmation: !data.session };
    },
    [],
  );

  const resetPassword = useCallback(async (email: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });
    return { error: error ? authErrorMessage(error.message) : null };
  }, []);

  const updatePassword = useCallback(async (password: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error: error ? authErrorMessage(error.message) : null };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        roles,
        loading,
        profileLoading,
        isAuthenticated: Boolean(session?.user),
        isAdmin: roles.includes("admin"),
        isInstructor: roles.includes("instructor"),
        hasRole,
        hasAnyRole,
        signIn,
        signUp,
        resetPassword,
        updatePassword,
        refreshProfile: async () => {
          if (userId) await loadProfileAndRoles(userId);
        },
        signOut: async () => {
          await supabase.auth.signOut();
          setProfile(null);
          setRoles([]);
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
