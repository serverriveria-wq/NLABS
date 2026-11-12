import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/spa/hooks/useAuth";
import { toast } from "sonner";
import { AuthView, AUTH_PAGE_DEFAULTS, useAuthPageConfig } from "@/spa/components/AuthView";

/** Inicio de sesión SOLO con Google («Conectar con Google»). */
export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const cfgQ = useAuthPageConfig();
  const cfg = cfgQ.data ?? AUTH_PAGE_DEFAULTS;
  const [loading, setLoading] = useState(false);

  // Si ya hay sesión, entra directo.
  useEffect(() => {
    if (!authLoading && user) {
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from && from !== "/auth" ? from : "/dashboard", { replace: true });
    }
  }, [authLoading, user, navigate, location.state]);

  // Si Google/Supabase devolvió un error en la URL, lo mostramos.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search + "&" + window.location.hash.replace(/^#/, ""));
    const desc = params.get("error_description");
    if (desc) toast.error(decodeURIComponent(desc.replace(/\+/g, " ")));
  }, []);

  async function signInWithGoogle() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth`, queryParams: { prompt: "select_account" } },
    });
    if (error) {
      setLoading(false);
      toast.error(/provider is not enabled|unsupported provider/i.test(error.message)
        ? "Google no está activado en Supabase todavía (Authentication → Providers → Google)."
        : error.message);
    }
    // Si todo va bien, el navegador se redirige a Google.
  }

  return (
    <>
      <Helmet>
        <title>{`Entrar — ${cfg.title}`}</title>
        <meta name="description" content={cfg.subtitle} />
      </Helmet>
      <AuthView cfg={cfg} loading={loading} onGoogle={signInWithGoogle} />
    </>
  );
}
