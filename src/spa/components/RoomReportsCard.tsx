import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Flag, Trash2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as unknown as { from: (t: string) => any };
type Row = { id: string; message_id: string; reason: string | null; created_at: string; body: string; author: string; reporter: string };

/** Moderación de Room: reportes abiertos. Solo administradores (RLS). */
export function RoomReportsCard() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["room-reports"],
    queryFn: async (): Promise<Row[]> => {
      const { data: reps, error } = await db.from("room_reports").select("*").eq("status", "open").order("created_at", { ascending: false });
      if (error) throw error;
      if (!reps?.length) return [];
      const { data: msgs } = await db.from("room_messages").select("id, body, user_id").in("id", [...new Set(reps.map((r: any) => r.message_id))]);
      const mm: Record<string, any> = Object.fromEntries((msgs ?? []).map((m: any) => [m.id, m]));
      const uids = [...new Set([...(msgs ?? []).map((m: any) => m.user_id), ...reps.map((r: any) => r.reporter_id)])] as string[];
      const { data: profs } = await supabase.from("profiles").select("id, username, display_name").in("id", uids);
      const pn: Record<string, string> = Object.fromEntries((profs ?? []).map((p) => [p.id, p.display_name || p.username]));
      return reps.map((r: any) => ({
        id: r.id, message_id: r.message_id, reason: r.reason, created_at: r.created_at,
        body: mm[r.message_id]?.body ?? "(mensaje eliminado)", author: pn[mm[r.message_id]?.user_id] ?? "—", reporter: pn[r.reporter_id] ?? "—",
      }));
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["room-reports"] });

  async function dismiss(id: string) {
    const { error } = await db.from("room_reports").update({ status: "dismissed" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Reporte descartado"); refresh();
  }
  async function removeMessage(r: Row) {
    if (!window.confirm("¿Eliminar este mensaje de Room?")) return;
    const { error } = await db.from("room_messages").delete().eq("id", r.message_id);
    if (error) return toast.error(error.message);
    toast.success("Mensaje eliminado"); refresh();
  }

  return (
    <div className="rounded-2xl border bg-card p-5 md:col-span-3">
      <h2 className="mb-1 flex items-center gap-2 font-semibold"><Flag className="h-4 w-4" /> Reportes de Room</h2>
      <p className="mb-3 text-sm text-muted-foreground">Mensajes del chat reportados por los miembros.</p>
      {q.isLoading ? <p className="text-sm text-muted-foreground">Cargando…</p>
        : q.error ? <p className="text-sm text-destructive">No se pudieron cargar los reportes.</p>
        : !q.data?.length ? <p className="text-sm text-muted-foreground">No hay reportes abiertos. 🎉</p>
        : (
          <ul className="space-y-2">
            {q.data.map((r) => (
              <li key={r.id} className="rounded-xl border bg-secondary/30 p-3 text-sm">
                <p><b>{r.author}</b>: <span className="break-words">{r.body}</span></p>
                <p className="mt-1 text-xs text-muted-foreground">Reportado por {r.reporter}{r.reason ? ` · «${r.reason}»` : ""} · {new Date(r.created_at).toLocaleString("es")}</p>
                <div className="mt-2 flex gap-2">
                  <button onClick={() => removeMessage(r)} className="btn"><Trash2 className="h-3.5 w-3.5" /> Eliminar mensaje</button>
                  <button onClick={() => dismiss(r.id)} className="btn"><Check className="h-3.5 w-3.5" /> Descartar</button>
                </div>
              </li>
            ))}
          </ul>
        )}
    </div>
  );
}
