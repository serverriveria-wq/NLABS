import { useEffect, useState, type ReactNode } from "react";
import { Bell, ExternalLink, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { enablePush, isInIframe, pushPermission, type PushResult } from "@/spa/lib/push";

const OK_KEY = "nlab.push.ready";
const SKIP_KEY = "nlab.push.skipped";

/**
 * Invita a activar las notificaciones, pero permite continuar sin ellas.
 */
export function PushGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(
    () => sessionStorage.getItem(OK_KEY) === "1" || localStorage.getItem(SKIP_KEY) === "1",
  );
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PushResult | null>(null);

  useEffect(() => {
    if (ready) return;
    // Si no hay soporte/config o estamos en preview, no bloqueamos.
    if (isInIframe() || pushPermission() === "unavailable") {
      setReady(true);
      return;
    }
    if (pushPermission() === "granted") {
      setBusy(true);
      enablePush()
        .then((r) => {
          setResult(r);
          if (r.status === "registered") {
            sessionStorage.setItem(OK_KEY, "1");
            setReady(true);
          } else if (r.status === "not-configured" || r.status === "unsupported") {
            setReady(true);
          }
        })
        .finally(() => setBusy(false));
    }
  }, [ready]);

  async function activate() {
    setBusy(true);
    const r = await enablePush();
    setResult(r);
    if (r.status === "registered") {
      sessionStorage.setItem(OK_KEY, "1");
      setReady(true);
    }
    setBusy(false);
  }

  function skip() {
    localStorage.setItem(SKIP_KEY, "1");
    setReady(true);
  }

  if (ready) return <>{children}</>;

  const unavailable = result?.status === "unsupported" || result?.status === "not-configured";

  return (
    <div className="grid min-h-screen place-items-center bg-background p-6">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-lg">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft text-primary">
          <Bell className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-xl font-bold">Activa las notificaciones</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Recomendado: cada cambio en los proyectos del team te llegará al teléfono. Puedes
          continuar sin ellas y activarlas más tarde.
        </p>

        {result?.status === "denied" && (
          <p className="mt-4 flex items-start gap-2 rounded-lg border bg-secondary/50 p-3 text-left text-xs text-muted-foreground">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            Bloqueaste las notificaciones. Actívalas en los ajustes del navegador para este sitio y
            vuelve a intentarlo.
          </p>
        )}

        {unavailable && (
          <p className="mt-4 rounded-lg border bg-secondary/50 p-3 text-left text-xs text-muted-foreground">
            Las notificaciones push no están disponibles en este navegador o aún no están
            configuradas.
          </p>
        )}

        {result?.status === "error" && (
          <p className="mt-4 rounded-lg border bg-secondary/50 p-3 text-left text-xs text-destructive">
            {result.message}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-2">
          <Button onClick={activate} disabled={busy} className="gap-2">
            <Bell className="h-4 w-4" /> {busy ? "Activando…" : "Activar notificaciones"}
          </Button>
          <Button variant="ghost" onClick={skip} className="gap-2">
            Continuar sin notificaciones
          </Button>
          {isInIframe() && (
            <Button asChild variant="outline" size="sm" className="gap-2">
              <a href={window.location.href} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" /> Abrir en pestaña nueva
              </a>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
