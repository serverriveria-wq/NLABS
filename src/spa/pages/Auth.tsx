import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/spa/hooks/useAuth";
import { toast } from "sonner";
import { AuthView, AUTH_PAGE_DEFAULTS, useAuthPageConfig } from "@/spa/components/AuthView";
import type { Session } from "@supabase/supabase-js";

type Mode = "signin" | "signup";

async function signInByUsername(identifier: string, password: string): Promise<Session | null> {
  const ident = identifier.trim().toLowerCase();
  if (!ident) return null;
  const { data, error } = await supabase.functions.invoke("resolve-login", {
    body: { identifier: ident, password },
  });
  if (error) return null;
  return (data as { session: Session | null } | null)?.session ?? null;
}

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const cfgQ = useAuthPageConfig();
  const cfg = cfgQ.data ?? AUTH_PAGE_DEFAULTS;
  const [mode, setMode] = useState<Mode>("signin");
  const [values, setValues] = useState({ identifier: "", email: "", username: "", password: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from && from !== "/auth" ? from : "/dashboard", { replace: true });
    }
  }, [authLoading, user, navigate, location.state]);

  async function onSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      let em = values.identifier.trim();
      if (!em.includes("@")) {
        const session = await signInByUsername(em, values.password);
        if (!session) { toast.error("Credenciales incorrectas"); return; }
        const { error } = await supabase.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token });
        if (error) throw error;
        toast.success("Bienvenido");
        navigate("/dashboard", { replace: true });
        return;
      }
      const { data: signed, error } = await supabase.auth.signInWithPassword({ email: em, password: values.password });
      if (error || !signed.user) { toast.error("Credenciales incorrectas"); return; }
      toast.success("Bienvenido");
      navigate("/dashboard", { replace: true });
    } catch {
      toast.error("No se pudo iniciar sesión");
    } finally { setLoading(false); }
  }

  async function onSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const uname = values.username.trim().toLowerCase();
      if (!/^[a-z0-9_.-]{2,40}$/.test(uname)) {
        toast.error("Usuario inválido (2-40 caracteres, letras/números/._-)");
        return;
      }
      const { data: signed, error } = await supabase.auth.signUp({
        email: values.email.trim(),
        password: values.password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { username: uname, display_name: uname },
        },
      });
      if (error) { toast.error(error.message); return; }
      if (!signed.user) { toast.error("No se pudo crear la cuenta"); return; }

      // Profiles and the default member role are created by the trusted signup trigger.
      // Privileged roles are never assigned using browser-supplied email or metadata.
      toast.success(signed.session ? "Cuenta creada." : "Revisa tu correo para confirmar la cuenta antes de iniciar sesión.");
      setMode("signin");
      setValues((v) => ({ ...v, identifier: uname, password: "" }));
    } catch (err) {
      toast.error((err as Error).message ?? "Error al crear la cuenta");
    } finally { setLoading(false); }
  }

  async function requestPasswordReset() {
    const email = values.identifier.trim();
    if (!email.includes("@")) { toast.error("Escribe tu correo para recuperar la contraseña."); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/recovery` });
    setLoading(false);
    if (error) { toast.error("No se pudo enviar el correo de recuperación."); return; }
    toast.success("Si existe una cuenta con ese correo, recibirás un enlace para elegir tu contraseña.");
  }

  return (
    <>
      <Helmet>
        <title>{`${cfg.tab_signin_label} — ${cfg.title}`}</title>
        <meta name="description" content={cfg.subtitle} />
      </Helmet>
      <AuthView
        cfg={cfg}
        mode={mode}
        onModeChange={setMode}
        values={values}
        onChange={(patch) => setValues((v) => ({ ...v, ...patch }))}
        onSubmit={mode === "signin" ? onSignIn : onSignUp}
        loading={loading}
        onRecover={requestPasswordReset}
      />
    </>
  );
}
