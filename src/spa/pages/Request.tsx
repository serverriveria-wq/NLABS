import { useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UserPlus, Clock, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/spa/hooks/useAuth";
import { useMe } from "@/spa/hooks/useMe";
import { MemberBadge } from "@/spa/components/MemberBadge";

export default function RequestPage() {
  const { user } = useAuth();
  const me = useMe();
  const qc = useQueryClient();

  const modalities = useQuery({
    queryKey: ["modalities"],
    queryFn: async () => (await supabase.from("modalities").select("id,name,slug").order("name")).data ?? [],
  });

  const mine = useQuery({
    queryKey: ["my-team-request", user?.id],
    enabled: !!user?.id,
    queryFn: async () =>
      (await supabase
        .from("team_requests" as never)
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()).data as any,
  });

  const [form, setForm] = useState({
    username: "",
    modality_id: "",
    playtime: "",
    reason: "",
    accepted_terms: false,
  });
  const [busy, setBusy] = useState(false);

  const profileUsername = me.data?.profile?.username ?? "";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.accepted_terms) return toast.error("Debes aceptar los términos y condiciones");
    setBusy(true);
    try {
      const { error } = await supabase.from("team_requests" as never).insert({
        user_id: user!.id,
        username: form.username || profileUsername,
        modality_id: form.modality_id || null,
        playtime: form.playtime || null,
        reason: form.reason,
        accepted_terms: true,
      } as never);
      if (error) throw error;
      toast.success("Solicitud enviada. Un administrador la revisará.");
      qc.invalidateQueries({ queryKey: ["my-team-request"] });
    } catch (e: any) {
      toast.error(e.message ?? "Error al enviar");
    } finally {
      setBusy(false);
    }
  }

  const req = mine.data;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
      <Helmet><title>Request — Únete al team | NLab</title></Helmet>
      <div className="mb-6 flex items-center gap-2">
        <UserPlus className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">Request — Únete al team</h1>
      </div>

      {me.data?.profile?.badge_label && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border bg-card p-4 text-sm">
          Tu insignia actual:
          <MemberBadge label={me.data.profile.badge_label} gradient={me.data.profile.badge_gradient as any} />
        </div>
      )}

      {req && req.status === "pending" && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border bg-card p-4 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" /> Tu solicitud está pendiente de revisión.
        </div>
      )}
      {req && req.status === "approved" && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border bg-card p-4 text-sm">
          <CheckCircle2 className="h-4 w-4 text-primary" /> Solicitud aprobada. ¡Bienvenido!
        </div>
      )}
      {req && req.status === "rejected" && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border bg-card p-4 text-sm">
          <XCircle className="h-4 w-4 text-destructive" /> Tu solicitud fue rechazada. Puedes enviar otra.
        </div>
      )}

      {(!req || req.status !== "pending") && (
        <form onSubmit={submit} className="space-y-4 rounded-2xl border bg-card p-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Username</label>
            <input
              required
              className="input"
              value={form.username}
              placeholder={profileUsername || "Tu nombre en el juego"}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Especialidad</label>
            <select
              required
              className="input"
              value={form.modality_id}
              onChange={(e) => setForm({ ...form, modality_id: e.target.value })}
            >
              <option value="">Selecciona…</option>
              {(modalities.data ?? []).map((m: any) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Tiempo jugando</label>
            <input
              className="input"
              placeholder="Ej. 4 años"
              value={form.playtime}
              onChange={(e) => setForm({ ...form, playtime: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Motivo para unirte</label>
            <textarea
              required
              rows={5}
              className="input"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
            />
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={form.accepted_terms}
              onChange={(e) => setForm({ ...form, accepted_terms: e.target.checked })}
            />
            <span>
              Acepto los{" "}
              <Link to="/docs/terminos" className="text-primary underline">términos y condiciones</Link>{" "}
              (reglas, permisos y limitaciones).
            </span>
          </label>
          <button disabled={busy} className="w-full rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
            {busy ? "Enviando…" : "Enviar solicitud"}
          </button>
        </form>
      )}
    </div>
  );
}
