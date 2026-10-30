import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { FolderKanban, Users, Plus, TrendingUp, Sparkles } from "lucide-react";
import { statusMeta, typeMeta } from "@/lib/nlab-constants";
import { useMe } from "@/spa/hooks/useMe";
import { AdSlot } from "@/spa/components/AdSense";
import { fetchVideo } from "@/spa/components/DashboardVideoCard";

export default function Dashboard() {
  const me = useMe();

  const projects = useQuery({
    queryKey: ["dashboard-projects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects")
        .select("id, slug, name, type, status, progress, banner_url, created_at")
        .order("created_at", { ascending: false }).limit(6);
      if (error) throw error;
      return data;
    },
  });

  const counts = useQuery({
    queryKey: ["dashboard-counts"],
    queryFn: async () => {
      const [p, m] = await Promise.all([
        supabase.from("projects").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);
      return { projects: p.count ?? 0, members: m.count ?? 0 };
    },
  });

  const video = useQuery({ queryKey: ["dashboard-video"], queryFn: fetchVideo });

  const displayName = me.data?.profile?.display_name ?? me.data?.profile?.username ?? "Miembro";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      <Helmet><title>Dashboard — NLabs</title></Helmet>
      {video.data && (
        <video src={video.data} autoPlay loop muted playsInline preload="auto"
          className="mb-6 max-h-80 w-full rounded-2xl border object-cover shadow-sm" />
      )}
      <AdSlot placement="dashboard" position="top" className="mb-6" />
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">Bienvenido de vuelta,</p>
          <h1 className="truncate text-2xl font-bold tracking-tight md:text-3xl">{displayName}</h1>
        </div>
        <Link to="/createcolab" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft hover:opacity-90">
          <Plus className="h-4 w-4" /> Nuevo proyecto
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={FolderKanban} label="Proyectos" value={counts.data?.projects ?? "—"} tone="primary" />
        <StatCard icon={Users} label="Miembros" value={counts.data?.members ?? "—"} tone="success" />
        <StatCard icon={Sparkles} label="Tus modalidades" value={me.data?.modalities.length ?? 0} tone="warning" />
        <StatCard icon={TrendingUp} label="Roles" value={me.data?.roles.length ?? 0} tone="info" />
      </div>

      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Proyectos recientes</h2>
          <Link to="/projects" className="text-sm text-primary hover:underline">Ver todos →</Link>
        </div>
        {projects.isLoading ? (
          <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">Cargando…</div>
        ) : projects.data?.length === 0 ? (
          <div className="rounded-2xl border bg-card p-10 text-center">
            <FolderKanban className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">Aún no hay proyectos</p>
            <p className="mt-1 text-sm text-muted-foreground">Crea el primer collab del equipo.</p>
            <Link to="/createcolab" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              <Plus className="h-4 w-4" /> Crear proyecto
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.data?.map((p: any) => {
              const s = statusMeta(p.status);
              const t = typeMeta(p.type);
              return (
                <Link key={p.id} to={`/p/${p.slug ?? p.id}`} className="group overflow-hidden rounded-2xl border bg-card transition hover:shadow-elevated">
                  <div className="h-28 bg-gradient-to-br from-primary/30 to-primary/5" style={p.banner_url ? { backgroundImage: `url(${p.banner_url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined} />
                  <div className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary">{t.label}</span>
                      <span className="rounded-full border px-2 py-0.5 text-xs">{s.label}</span>
                    </div>
                    <h3 className="mt-2 truncate font-semibold group-hover:text-primary">{p.name}</h3>
                    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-primary" style={{ width: `${p.progress}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{p.progress}% completado</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <AdSlot placement="dashboard" position="bottom" className="mt-10" />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone }: { icon: any; label: string; value: any; tone: string }) {
  const tones: Record<string, string> = {
    primary: "bg-primary-soft text-primary",
    success: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700",
    info: "bg-sky-100 text-sky-700",
  };
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-soft">
      <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${tones[tone]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}