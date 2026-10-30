import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

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
  mode,
  onModeChange,
  values,
  onChange,
  onSubmit,
  loading = false,
  preview = false,
  onRecover,
}: {
  cfg: AuthPageConfig;
  mode: "signin" | "signup";
  onModeChange: (m: "signin" | "signup") => void;
  values: Values;
  onChange: (patch: Partial<Values>) => void;
  onSubmit?: (e: React.FormEvent) => void;
  loading?: boolean;
  preview?: boolean;
  onRecover?: () => void;
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
          <div className="mb-4 flex gap-1 rounded-lg bg-muted p-1">
            <button type="button" onClick={() => onModeChange("signin")}
              className={`flex-1 rounded-md py-1.5 text-sm font-medium transition ${mode === "signin" ? "bg-card shadow-soft" : "text-muted-foreground"}`}>
              {cfg.tab_signin_label}
            </button>
            <button type="button" onClick={() => onModeChange("signup")}
              className={`flex-1 rounded-md py-1.5 text-sm font-medium transition ${mode === "signup" ? "bg-card shadow-soft" : "text-muted-foreground"}`}>
              {cfg.tab_signup_label}
            </button>
          </div>

          {mode === "signin" ? (
            <form onSubmit={onSubmit} className="space-y-4">
              <Field label={cfg.identifier_label}>
                <input type="text" autoComplete="username" required={!preview} value={values.identifier}
                  onChange={(e) => onChange({ identifier: e.target.value })}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder={cfg.identifier_placeholder} />
              </Field>
              <Field label={cfg.password_label}>
                <input type="password" autoComplete="current-password" required={!preview} value={values.password}
                  onChange={(e) => onChange({ password: e.target.value })}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder={cfg.password_placeholder} />
              </Field>
              <SubmitBtn loading={loading} preview={preview}>{cfg.signin_button}</SubmitBtn>
              {!preview && onRecover && <Button type="button" variant="link" className="w-full" onClick={onRecover} disabled={loading}>Recuperar contraseña</Button>}
            </form>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <Field label={cfg.email_label}>
                <input type="email" required={!preview} value={values.email}
                  onChange={(e) => onChange({ email: e.target.value })}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder={cfg.email_placeholder} />
              </Field>
              <Field label={cfg.username_label}>
                <input type="text" required={!preview} value={values.username}
                  onChange={(e) => onChange({ username: e.target.value })}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder={cfg.username_placeholder} />
              </Field>
              <Field label={cfg.password_label}>
                <input type="password" required={!preview} minLength={6} value={values.password}
                  onChange={(e) => onChange({ password: e.target.value })}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder={cfg.password_placeholder} />
              </Field>
              <SubmitBtn loading={loading} preview={preview}>{cfg.signup_button}</SubmitBtn>
            </form>
          )}

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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}

function SubmitBtn({ loading, preview, children }: { loading: boolean; preview: boolean; children: React.ReactNode }) {
  return (
    <button type="submit" disabled={loading || preview}
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition hover:opacity-90 disabled:opacity-50">
      {loading && <Loader2 className="h-4 w-4 animate-spin" />} {children}
    </button>
  );
}
