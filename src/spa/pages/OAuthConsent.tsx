import { useEffect, useState } from "react";
import { Navigate, useLocation, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ShieldCheck, ShieldX, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/spa/hooks/useAuth";
import { BrandLoader } from "@/spa/components/BrandLoader";
import { Button } from "@/components/ui/button";

// Pantalla de consentimiento del servidor OAuth 2.1 de Supabase (ruta: /oauth/consent).
// Supabase redirige aquí con ?authorization_id=... ; el usuario aprueba o rechaza y Supabase devuelve la URL de retorno.
type Details = {
  authorization_id?: string;
  redirect_url?: string;
  client?: { id?: string; name?: string; uri?: string; logo_uri?: string };
  user?: { email?: string };
  scope?: string;
};
const oauth = () => (supabase.auth as unknown as { oauth: Record<string, (...a: unknown[]) => Promise<{ data: Record<string, string> | Details | null; error: { message: string } | null }>> }).oauth;

const SCOPE_LABEL: Record<string, string> = {
  openid: "Verificar tu identidad",
  email: "Ver tu correo electrónico",
  profile: "Ver tu perfil (nombre y avatar)",
  phone: "Ver tu teléfono",
};

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const id = params.get("authorization_id");
  const [details, setDetails] = useState<Details | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"approve" | "deny" | null>(null);

  useEffect(() => {
    if (!id || authLoading || !user) return;
    (async () => {
      const { data, error } = await oauth().getAuthorizationDetails(id);
      if (error || !data) return setError(error?.message ?? "No se pudo cargar la solicitud de autorización.");
      const d = data as Details;
      // Si el usuario ya autorizó antes, Supabase devuelve directamente la URL de retorno.
      if (d.redirect_url) { window.location.href = d.redirect_url; return; }
      setDetails(d);
    })();
  }, [id, user, authLoading]);

  if (authLoading) return <BrandLoader />;
  if (!user) return <Navigate to="/auth" replace state={{ from: location.pathname + location.search }} />;

  async function decide(kind: "approve" | "deny") {
    if (!id) return;
    setBusy(kind);
    const { data, error } = await (kind === "approve" ? oauth().approveAuthorization(id) : oauth().denyAuthorization(id));
    if (error || !data) { setBusy(null); return setError(error?.message ?? "No se pudo completar la acción."); }
    const url = (data as { redirect_url?: string }).redirect_url;
    if (url) window.location.href = url; else setBusy(null);
  }

  const scopes = (details?.scope ?? "").split(/[\s,]+/).filter(Boolean);
  return (
    <div className="grid min-h-screen place-items-center bg-background p-4">
      <Helmet><title>Autorizar acceso — NLabs</title></Helmet>
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-sm">
        {!id || error ? (
          <div className="text-center">
            <ShieldX className="mx-auto mb-3 h-10 w-10 text-destructive" />
            <h1 className="text-lg font-semibold">No se puede autorizar</h1>
            <p className="mt-1 text-sm text-muted-foreground">{error ?? "Falta el identificador de autorización (authorization_id)."}</p>
          </div>
        ) : !details ? (
          <div className="grid place-items-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            <div className="mb-4 text-center">
              {details.client?.logo_uri
                ? <img src={details.client.logo_uri} alt="" className="mx-auto mb-3 h-14 w-14 rounded-xl object-contain" />
                : <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-primary" />}
              <h1 className="text-lg font-semibold">{details.client?.name ?? "Una aplicación"} quiere acceder a tu cuenta de NLabs</h1>
              {details.user?.email && <p className="mt-1 text-xs text-muted-foreground">Sesión iniciada como {details.user.email}</p>}
            </div>
            {scopes.length > 0 && (
              <ul className="mb-4 space-y-1.5 rounded-xl border bg-secondary/40 p-3 text-sm">
                {scopes.map((s) => <li key={s}>• {SCOPE_LABEL[s] ?? s}</li>)}
              </ul>
            )}
            {details.client?.uri && <p className="mb-4 break-all text-xs text-muted-foreground">Sitio de la aplicación: {details.client.uri}</p>}
            <p className="mb-4 text-xs text-muted-foreground">Solo aprueba si reconoces esta aplicación. Puedes revocar el acceso más tarde.</p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" disabled={!!busy} onClick={() => decide("deny")}>{busy === "deny" ? "Rechazando…" : "Rechazar"}</Button>
              <Button className="flex-1" disabled={!!busy} onClick={() => decide("approve")}>{busy === "approve" ? "Autorizando…" : "Autorizar"}</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
