import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MemberBadge } from "@/spa/components/MemberBadge";
import { Users, LayoutGrid } from "lucide-react";

export default function Members() {
  const { data, isLoading } = useQuery({
    queryKey: ["members-grouped"],
    queryFn: async () => {
      const [mods, profiles, links] = await Promise.all([
        supabase.from("modalities").select("id, name, slug, icon_url").order("name"),
        supabase.from("profiles").select("id, username, display_name, avatar_url, status, bio, badge_label, badge_gradient"),
        supabase.from("user_modalities").select("user_id, modality_id"),
      ]);
      if (mods.error || profiles.error || links.error) throw new Error("load failed");
      const profById: Record<string, any> = {};
      profiles.data?.forEach((p) => (profById[p.id] = p));
      const grouped: Record<string, { modality: any; members: any[] }> = {};
      mods.data?.forEach((m) => (grouped[m.id] = { modality: m, members: [] }));
      links.data?.forEach((l) => {
        if (grouped[l.modality_id] && profById[l.user_id]) grouped[l.modality_id].members.push(profById[l.user_id]);
      });
      const unassigned = (profiles.data ?? []).filter(
        (p) => !links.data?.some((l) => l.user_id === p.id),
      );
      return { grouped: Object.values(grouped), unassigned, total: profiles.data?.length ?? 0 };
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      <Helmet><title>Miembros — NLab</title></Helmet>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Miembros</h1>
          <p className="text-sm text-muted-foreground">{data?.total ?? 0} miembros del equipo agrupados por modalidad.</p>
        </div>
        <Link to="/membersall" className="inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm font-medium shadow-soft hover:bg-accent">
          <LayoutGrid className="h-4 w-4" /> Ver todos los miembros
        </Link>
      </div>

      {isLoading ? (
        <div className="mt-6 rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">Cargando…</div>
      ) : (
        <div className="mt-6 space-y-6">
          {data?.grouped.filter((g) => g.members.length > 0).map((g) => (
            <section key={g.modality.id}>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                {g.modality.icon_url ? (
                  <img src={g.modality.icon_url} alt="" className="h-5 w-5 rounded object-cover" />
                ) : (
                  <Users className="h-4 w-4" />
                )}
                {g.modality.name} <span className="rounded-full bg-muted px-2 text-xs">{g.members.length}</span>
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {g.members.map((m) => <MemberCard key={m.id} m={m} />)}
              </div>
            </section>
          ))}
          {data && data.unassigned.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Sin modalidad asignada</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.unassigned.map((m) => <MemberCard key={m.id} m={m} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function MemberCard({ m }: { m: any }) {
  const initial = (m.display_name ?? m.username ?? "?").slice(0, 1).toUpperCase();
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
      {m.avatar_url ? (
        <img src={m.avatar_url} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
      ) : (
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft font-semibold text-primary">{initial}</div>
      )}
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 truncate text-sm font-medium">{m.display_name ?? m.username} <MemberBadge label={m.badge_label} gradient={m.badge_gradient} /></p>
        <p className="truncate text-xs text-muted-foreground">@{m.username}</p>
      </div>
    </div>
  );
}