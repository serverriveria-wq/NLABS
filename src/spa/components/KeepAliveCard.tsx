import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DatabaseZap, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const KEY = "nlabs.keepalive.last";

/** Botón verde «Reactivar BD»: hace una consulta real a la base de datos para que Supabase no la pause por inactividad. */
export function KeepAliveCard() {
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<string | null>(() => localStorage.getItem(KEY));

  async function ping(silent = false) {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("keepalive");
    setBusy(false);
    if (error || !data?.ok) { if (!silent) toast.error("La base de datos no respondió. Si el proyecto está pausado, restáuralo en el panel de Supabase."); return; }
    localStorage.setItem(KEY, data.at); setLast(data.at);
    if (!silent) toast.success(`Base de datos activa (${data.ms} ms)`);
  }
  // Un ping automático al abrir Shell si pasó más de un día.
  useEffect(() => {
    const t = last ? Date.parse(last) : 0;
    if (Date.now() - t > 24 * 3600 * 1000) ping(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-5 md:col-span-3">
      <div>
        <h2 className="flex items-center gap-2 font-semibold"><DatabaseZap className="h-4 w-4 text-green-600" /> Base de datos</h2>
        <p className="text-sm text-muted-foreground">Evita que Supabase pause el proyecto por inactividad.{last && <> Último ping: {new Date(last).toLocaleString("es")}.</>}</p>
      </div>
      <button onClick={() => ping(false)} disabled={busy}
        className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-green-700 disabled:opacity-60">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <DatabaseZap className="h-4 w-4" />} Reactivar BD
      </button>
    </div>
  );
}
