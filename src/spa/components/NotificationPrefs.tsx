import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { enablePush, pushPermission } from "@/spa/lib/push";
import { Button } from "@/components/ui/button";

const db = supabase as unknown as { from: (t: string) => any };
const CATS: [string, string, string][] = [
  ["projects", "Proyectos", "Nuevos proyectos y cambios de estado o progreso"],
  ["comments", "Comentarios", "Comentarios nuevos en proyectos"],
  ["tasks", "Tareas y partes", "Tareas nuevas y partes que te asignen"],
  ["members", "Integrantes", "Cuando alguien se une a un proyecto"],
  ["announcements", "Noticias / avisos", "Avisos oficiales del team"],
  ["mail", "Correo", "Mensajes directos"],
  ["art", "Arte", "Obras nuevas en la galería"],
  ["music", "Música", "Pistas nuevas en la biblioteca"],
  ["chat", "Menciones en Room", "Cuando alguien te mencione con @usuario"],
  ["push", "Notificaciones push", "Avisos en el dispositivo aunque la pestaña esté cerrada"],
];

/** Preferencias por categoría + estado real del permiso del navegador. */
export function NotificationPrefs() {
  const [prefs, setPrefs] = useState<Record<string, boolean> | null>(null);
  const [perm, setPerm] = useState(pushPermission());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await db.from("notification_preferences").select("*").eq("user_id", u.user.id).maybeSingle();
      setPrefs(Object.fromEntries(CATS.map(([k]) => [k, data ? data[k] !== false : true])));
    })();
  }, []);

  async function toggle(k: string, v: boolean) {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    setPrefs((p) => ({ ...(p ?? {}), [k]: v }));
    const { error } = await db.from("notification_preferences").upsert({ user_id: u.user.id, [k]: v, updated_at: new Date().toISOString() });
    if (error) { toast.error(error.message); setPrefs((p) => ({ ...(p ?? {}), [k]: !v })); }
  }
  async function activate() {
    setBusy(true);
    const r = await enablePush();
    setBusy(false);
    setPerm(pushPermission());
    if (r.status === "registered") toast.success("Notificaciones push activadas en este dispositivo.");
    else if (r.status === "denied") toast.error("El navegador las tiene bloqueadas. Actívalas en los ajustes del sitio.");
    else if (r.status === "unsupported") toast.error("Este navegador no admite notificaciones push (en iPhone, instala NLabs en la pantalla de inicio).");
    else toast.error(r.message ?? "No se pudo activar.");
  }

  return (
    <section className="mb-6 rounded-2xl border bg-card p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold"><Bell className="h-4 w-4 text-primary" /> Preferencias de notificaciones</h2>
        {perm === "granted"
          ? <span className="text-xs text-green-600">Permiso del navegador: concedido</span>
          : <Button size="sm" onClick={activate} disabled={busy} className="gap-1.5">{perm === "denied" ? <BellOff className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}{busy ? "Activando…" : "Activar en este dispositivo"}</Button>}
      </div>
      {perm === "denied" && <p className="mb-3 text-xs text-muted-foreground">Bloqueaste las notificaciones: pulsa el candado junto a la dirección web → Notificaciones → Permitir.</p>}
      {!prefs ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : (
        <ul className="divide-y">
          {CATS.map(([k, label, hint]) => (
            <li key={k} className="flex items-center justify-between gap-3 py-2.5">
              <div><p className="text-sm font-medium">{label}</p><p className="text-xs text-muted-foreground">{hint}</p></div>
              <input type="checkbox" className="h-5 w-5 accent-[var(--color-primary)]" checked={prefs[k] !== false} onChange={(e) => toggle(k, e.target.checked)} aria-label={label} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
