import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Lock, Wrench, Layers, Users } from "lucide-react";
import { GdLevelPreview } from "@/spa/components/GdLevelPreview";
import { GithubLink } from "@/spa/components/GithubField";
import { SectionIcon } from "@/spa/components/SectionIcon";

type PublicProject = {
  id: string; slug?: string; name: string; description?: string; type?: string; status?: string; difficulty?: string;
  tags?: string[]; banner_url?: string; thumbnail_url?: string; song_name?: string; song_url?: string; bpm?: number | string;
  level_id?: string | number; gd_version?: string; level_length?: string; progress?: number; tools?: string[];
  github_enabled?: boolean; github_url?: string; preview_video_url?: string; deadline?: string;
  members?: { username: string; display_name: string | null; avatar_url: string | null; role: string | null }[];
  parts?: { name: string; percent_range: string | null; status: string }[];
};

/** Página SIN login para proyectos con visibilidad «Público». Se abre en /public/<slug o id>. */
export default function PublicProjectPage() {
  const { ref } = useParams();
  const q = useQuery({
    queryKey: ["public-project", ref],
    queryFn: async (): Promise<PublicProject | null> => {
      const { data, error } = await (supabase as unknown as { rpc: (n: string, a: object) => Promise<{ data: unknown; error: { message: string } | null }> })
        .rpc("get_public_project", { p_ref: ref });
      if (error) throw new Error(error.message);
      return (data as PublicProject | null) ?? null;
    },
  });
  const p = q.data;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link to="/" className="text-sm font-bold">NLabs</Link>
          <Link to="/auth" className="text-sm text-primary hover:underline">Entrar</Link>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8">
        {q.isLoading && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Cargando…</p>}
        {q.error && <p className="text-sm text-destructive">No se pudo cargar. ¿Ejecutaste supabase/migration_v5.sql?</p>}
        {!q.isLoading && !q.error && !p && (
          <div className="rounded-2xl border bg-card p-10 text-center">
            <Lock className="mx-auto h-8 w-8 text-muted-foreground" />
            <h1 className="mt-3 text-lg font-semibold">Este proyecto no es público</h1>
            <p className="mt-1 text-sm text-muted-foreground">Puede ser un borrador, estar en modo equipo/privado o no existir.</p>
          </div>
        )}
        {p && (
          <>
            <Helmet><title>{p.name} — NLabs</title><meta name="description" content={(p.description ?? "").slice(0, 150)} /></Helmet>
            {p.banner_url && <img src={p.banner_url} alt="" className="mb-5 h-48 w-full rounded-2xl object-cover md:h-64" />}
            <h1 className="text-3xl font-bold tracking-tight">{p.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              {p.type && <span className="rounded-full bg-primary-soft px-2.5 py-1 font-medium text-primary">{p.type}</span>}
              {p.status && <span className="rounded-full border px-2.5 py-1">{p.status}</span>}
              {p.difficulty && <span className="rounded-full border px-2.5 py-1">{p.difficulty}</span>}
              {p.bpm && <span className="rounded-full border px-2.5 py-1">{p.bpm} BPM</span>}
              {p.github_enabled && <GithubLink url={p.github_url} />}
            </div>
            {typeof p.progress === "number" && (
              <div className="mt-4">
                <div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>Progreso</span><span>{p.progress}%</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, p.progress))}%` }} /></div>
              </div>
            )}
            {p.description && <p className="mt-5 whitespace-pre-wrap text-sm leading-relaxed">{p.description}</p>}
            {p.song_name && <p className="mt-4 text-sm"><b>Canción:</b> {p.song_url ? <a className="text-primary hover:underline" href={p.song_url} target="_blank" rel="noopener noreferrer">{p.song_name}</a> : p.song_name}</p>}
            {(p.tags?.length ?? 0) > 0 && <div className="mt-3 flex flex-wrap gap-1">{p.tags!.map((t) => <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-xs">#{t}</span>)}</div>}
            {(p.tools?.length ?? 0) > 0 && <div className="mt-3 flex flex-wrap gap-2">{p.tools!.map((t) => <span key={t} className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs"><Wrench className="h-3 w-3" /> {t}</span>)}</div>}

            {(p.parts?.length ?? 0) > 0 && (
              <section className="mt-8 rounded-2xl border bg-card p-5">
                <h2 className="mb-3 flex items-center gap-2 font-semibold"><SectionIcon k="parts" fallback={Layers} /> Partes</h2>
                <ul className="divide-y text-sm">{p.parts!.map((x, i) => <li key={i} className="flex justify-between gap-2 py-2"><span>{x.name}</span><span className="text-xs text-muted-foreground">{x.percent_range ?? ""} · {x.status}</span></li>)}</ul>
              </section>
            )}
            {(p.members?.length ?? 0) > 0 && (
              <section className="mt-4 rounded-2xl border bg-card p-5">
                <h2 className="mb-3 flex items-center gap-2 font-semibold"><SectionIcon k="participants" fallback={Users} /> Participantes</h2>
                <ul className="grid gap-2 sm:grid-cols-2">{p.members!.map((m, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    {m.avatar_url ? <img src={m.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" /> : <span className="grid h-7 w-7 place-items-center rounded-full bg-muted text-xs">{(m.display_name || m.username)[0]?.toUpperCase()}</span>}
                    <span>{m.display_name || m.username}{m.role && <span className="text-xs text-muted-foreground"> · {m.role}</span>}</span>
                  </li>
                ))}</ul>
              </section>
            )}
            {p.level_id && <GdLevelPreview levelId={p.level_id} className="mt-6" />}
          </>
        )}
      </main>
    </div>
  );
}
