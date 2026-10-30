import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MemberBadge } from "@/spa/components/MemberBadge";
import { ArrowLeft, Search } from "lucide-react";
import { SocialIcons, useSocialTypes } from "@/spa/components/UserSocials";
import { useMemo, useState } from "react";

export default function MembersAll() {
  const [q, setQ] = useState("");
  const socialTypes = useSocialTypes();

  const { data, isLoading } = useQuery({
    queryKey: ["members-all"],
    queryFn: async () => {
      const [profiles, links, mods, roles, socials] = await Promise.all([
        supabase.from("profiles").select("id, username, display_name, avatar_url, banner_url, bio, status, joined_at, badge_label, badge_gradient").order("joined_at", { ascending: false }),
        supabase.from("user_modalities").select("user_id, modality_id"),
        supabase.from("modalities").select("id, name, icon_url"),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("user_socials" as never).select("user_id, social_type_id, value"),
      ]);
      const socialsByUser: Record<string, any[]> = {};
      ((socials.data ?? []) as any[]).forEach((s: any) => ((socialsByUser[s.user_id] ||= []).push(s)));
      const modById: Record<string, any> = {};
      (mods.data ?? []).forEach((m: any) => (modById[m.id] = m));
      const rolesByUser: Record<string, string[]> = {};
      (roles.data ?? []).forEach((r: any) => ((rolesByUser[r.user_id] ||= []).push(r.role)));
      const modsByUser: Record<string, any[]> = {};
      (links.data ?? []).forEach((l: any) => {
        if (modById[l.modality_id]) (modsByUser[l.user_id] ||= []).push(modById[l.modality_id]);
      });
      return (profiles.data ?? []).map((p: any) => ({
        ...p,
        modalities: modsByUser[p.id] ?? [],
        roles: rolesByUser[p.id] ?? [],
        socials: socialsByUser[p.id] ?? [],
      }));
    },
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    const s = q.trim().toLowerCase();
    if (!s) return data;
    return data.filter((m: any) =>
      (m.display_name ?? "").toLowerCase().includes(s) ||
      (m.username ?? "").toLowerCase().includes(s) ||
      (m.bio ?? "").toLowerCase().includes(s) ||
      m.modalities.some((x: any) => x.name.toLowerCase().includes(s)),
    );
  }, [data, q]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      <Helmet><title>Todos los miembros — NLab</title></Helmet>
      <Link to="/members" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Miembros por modalidad
      </Link>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Todos los miembros</h1>
          <p className="text-sm text-muted-foreground">Vista completa sin separar por modalidad — {data?.length ?? 0} miembros en total.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, modalidad…"
            className="w-full rounded-lg border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-primary" />
        </div>
      </div>
      {isLoading ? (
        <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">Cargando…</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m: any) => (
            <div key={m.id} className="overflow-hidden rounded-2xl border bg-card shadow-soft">
              <div className="h-20 bg-gradient-to-br from-primary/30 to-primary/5"
                style={m.banner_url ? { backgroundImage: `url(${m.banner_url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined} />
              <div className="p-4">
                <div className="flex items-center gap-3">
                  {m.avatar_url ? (
                    <img src={m.avatar_url} alt="" className="-mt-10 h-14 w-14 shrink-0 rounded-full border-4 border-card object-cover" />
                  ) : (
                    <div className="-mt-10 grid h-14 w-14 shrink-0 place-items-center rounded-full border-4 border-card bg-primary-soft font-semibold text-primary">
                      {(m.display_name ?? m.username ?? "?").slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-sm font-semibold">{m.display_name ?? m.username} <MemberBadge label={m.badge_label} gradient={m.badge_gradient} /></p>
                    <p className="truncate text-xs text-muted-foreground">@{m.username}</p>
                  </div>
                  {m.status && m.status !== "active" && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{m.status}</span>
                  )}
                </div>
                {m.bio && <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{m.bio}</p>}
                <div className="mt-3 flex flex-wrap gap-1">
                  {m.roles.map((r: string) => (
                    <span key={r} className="rounded-full border border-primary/30 bg-primary-soft px-1.5 py-0.5 text-[10px] font-medium text-primary">{r}</span>
                  ))}
                </div>
                {m.modalities.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {m.modalities.map((mod: any) => (
                      <span key={mod.id} className="inline-flex items-center gap-1 rounded-full border bg-secondary/60 px-1.5 py-0.5 text-[10px]">
                        {mod.icon_url && <img src={mod.icon_url} alt="" className="h-3 w-3 rounded-sm object-cover" />}
                        {mod.name}
                      </span>
                    ))}
                  </div>
                )}
                <SocialIcons socials={m.socials} types={socialTypes.data ?? []} />
                <p className="mt-3 text-[10px] text-muted-foreground">Se unió el {new Date(m.joined_at).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">Sin resultados.</div>
          )}
        </div>
      )}
    </div>
  );
}