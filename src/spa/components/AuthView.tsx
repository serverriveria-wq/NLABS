import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type AuthPageConfig = {
  logo_url: string;
  title: string;
  subtitle: string;
  background_url: string;
  background_gradient: string;
  tab_signin_label: string;
  tab_signup_label: string;
  identifier_label: string;
  identifier_placeholder: string;
  password_label: string;
  password_placeholder: string;
  email_label: string;
  email_placeholder: string;
  username_label: string;
  username_placeholder: string;
  signin_button: string;
  signup_button: string;
  notice: string;
  show_back_link: boolean;
};

export const AUTH_PAGE_DEFAULTS: AuthPageConfig = {
  logo_url: "",
  title: "NLab",
  subtitle: "Plataforma privada de collabs de Geometry Dash",
  background_url: "",
  background_gradient: "",
  tab_signin_label: "Iniciar sesión",
  tab_signup_label: "Crear cuenta",
  identifier_label: "Usuario o correo",
  identifier_placeholder: "tu_usuario o correo@dominio",
  password_label: "Contraseña",
  password_placeholder: "••••••••",
  email_label: "Correo",
  email_placeholder: "tucorreo@dominio.com",
  username_label: "Usuario",
  username_placeholder: "usuario_gd",
  signin_button: "Ingresar",
  signup_button: "Crear cuenta",
  notice: "",
  show_back_link: true,
};

export function normalizeAuthConfig(row: Partial<AuthPageConfig> | null | undefined): AuthPageConfig {
  const out = { ...AUTH_PAGE_DEFAULTS };
  if (!row) return out;
  (Object.keys(AUTH_PAGE_DEFAULTS) as (keyof AuthPageConfig)[]).forEach((k) => {
    const v = (row as Record<string, unknown>)[k];
    if (k === "show_back_link") {
      if (typeof v === "boolean") (out as any)[k] = v;
      return;
    }
    if (typeof v === "string" && v.trim() !== "") (out as any)[k] = v;
  });
  return out;
}

export function useAuthPageConfig() {
  return useQuery({
    queryKey: ["auth-page-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("auth_page_settings" as never).select("*").maybeSingle();
      return normalizeAuthConfig(data as never);
    },
    staleTime: 60_000,
  });
}

type Values = { identifier: string; email: string; username: string; password: string };

export function AuthView({
  cfg,
  loading = false,
  preview = false,
  onGoogle,
}: {
  cfg: AuthPageConfig;
  // Props antiguos (formulario de correo/contraseña): ya no se usan, se aceptan para no romper la vista previa del admin.
  mode?: "signin" | "signup";
  onModeChange?: (m: "signin" | "signup") => void;
  values?: Values;
  onChange?: (patch: Partial<Values>) => void;
  onSubmit?: (e: React.FormEvent) => void;
  onRecover?: () => void;
  loading?: boolean;
  preview?: boolean;
  onGoogle?: () => void;
}) {
  const bgStyle: React.CSSProperties = cfg.background_url
    ? { backgroundImage: `url(${cfg.background_url})`, backgroundSize: "cover", backgroundPosition: "center" }
    : cfg.background_gradient
      ? { backgroundImage: cfg.background_gradient }
      : {
          // GIF de fondo (public/assets/auth-bg.gif). Si el archivo no existe, se ve el degradado de reserva.
          backgroundImage: "linear-gradient(rgba(8,8,20,.38), rgba(8,8,20,.38)), url(/assets/auth-bg.gif), linear-gradient(135deg,#f3f0ff,#e6f0fb)",
          backgroundSize: "cover", backgroundPosition: "center",
        };

  return (
    <div
      className={`flex ${preview ? "min-h-[560px] rounded-xl" : "min-h-screen"} items-center justify-center bg-gradient-to-br from-background via-primary-soft/40 to-background px-4 py-8`}
      style={bgStyle}
    >
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3">
          {cfg.logo_url ? (
            <img src={cfg.logo_url} alt={cfg.title} className="h-14 w-14 rounded-2xl object-cover shadow-elevated" />
          ) : (
            <img src="/assets/logo-purple.png" alt={cfg.title} className="h-16 w-16 object-contain drop-shadow-lg" />
          )}
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">{cfg.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{cfg.subtitle}</p>
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-soft">
          <p className="mb-4 text-center text-sm text-muted-foreground">Entra con tu cuenta de Google. Si es tu primera vez, se crea tu cuenta automáticamente.</p>
          <button type="button" onClick={onGoogle} disabled={loading || preview}
            className="flex w-full items-center justify-center gap-3 rounded-lg border bg-white py-2.5 text-sm font-semibold text-gray-800 shadow-soft transition hover:bg-gray-50 disabled:opacity-60">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleLogo />}
            Conectar con Google
          </button>

          {cfg.notice && <p className="mt-4 text-center text-xs text-muted-foreground">{cfg.notice}</p>}
        </div>

        {cfg.show_back_link && (
          <p className="mt-4 text-center text-xs text-muted-foreground">
            {preview ? <span>← Volver</span> : <Link to="/dashboard" className="hover:text-foreground">← Volver</Link>}
          </p>
        )}
      </div>
    </div>
  );
}

function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
