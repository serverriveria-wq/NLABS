import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef, useState } from "react";
import { PROJECT_STATUSES, PROJECT_TYPES, statusMeta, typeMeta } from "@/lib/nlab-constants";
import { Search, FolderKanban, Users, Palette, Music } from "lucide-react";
import { gradientStyle } from "@/lib/site-branding";
import { AdSlot } from "@/spa/components/AdSense";
import { DifficultyBadge } from "@/spa/components/DifficultySelect";

/** Menú de 4 puntitos: accesos a Collabs, Arte y Música (antes escondidos en «Crear»). */
function SectionsMenu({ onCollabs }: { onCollabs: () => void }) {
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent | TouchEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", away); document.addEventListener("touchstart", away); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("touchstart", away); document.removeEventListener("keydown", esc); };
  }, [open]);
  const items = [
    { label: "Collabs", icon: Users, go: () => onCollabs() },
    { label: "Arte", icon: Palette, go: () => nav("/studio/arte") },
    { label: "Música", icon: Music, go: () => nav("/studio/musica") },
  ];
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-label="Secciones: Collabs, Arte y Música" aria-expanded={open}
        className="grid h-10 w-10 place-items-center rounded-lg border bg-card hover:bg-accent">
        <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor" aria-hidden="true">
          <circle cx="6" cy="6" r="2.2" /><circle cx="14" cy="6" r="2.2" /><circle cx="6" cy="14" r="2.2" /><circle cx="14" cy="14" r="2.2" />
        </svg>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-2 w-44 overflow-hidden rounded-xl border bg-card shadow-elevated">
          {items.map(({ label, icon: I, go }) => (
            <button key={label} role="menuitem" onClick={() => { setOpen(false); go(); }} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-accent">
              <I className="h-4 w-4 text-primary" /> {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Projects() {
  const [q, setQ] = useState("");
  const [type, setType] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = (data ?? []).filter((p: any) =>
    (type === "all" || p.type === type) &&
    (status === "all" || p.status === status) &&
    (q === "" || p.name.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      <Helmet><title>Proyectos — NLab</title></Helmet>
      <AdSlot placement="projects" position="top" className="mb-6" />
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Proyectos</h1>
          <p className="text-sm text-muted-foreground">Todos los collabs y proyectos del equipo. Usa la sección <span className="font-medium text-foreground">Crear</span> del menú para añadir uno nuevo.</p>
        </div>
        <SectionsMenu onCollabs={() => { setType("collab"); setStatus("all"); setQ(""); }} />
      </div>
      <div className="mb-6 flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…"
            className="w-full rounded-lg border bg-card py-2 pl-9 pr-3 text-sm outline-none focus:border-primary" />
        </div>
        <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-lg border bg-card px-3 py-2 text-sm">
          <option value="all">Todos los tipos</option>
          {PROJECT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border bg-card px-3 py-2 text-sm">
          <option value="all">Todos los estados</option>
          {PROJECT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>
      {isLoading ? (
        <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">Cargando…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border bg-card p-10 text-center">
          <FolderKanban className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">No hay proyectos</p>
          <p className="mt-1 text-sm text-muted-foreground">Ajusta los filtros o crea uno nuevo.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p: any) => {
            const s = statusMeta(p.status);
            const t = typeMeta(p.type);
            const cover = p.thumbnail_url || p.banner_url;
            const segs = Array.isArray(p.name_segments) ? p.name_segments : null;
            return (
              <Link key={p.id} to={`/p/${p.slug ?? p.id}`} className="group overflow-hidden rounded-2xl border bg-card transition hover:shadow-elevated">
                <div className="h-28 bg-gradient-to-br from-primary/30 to-primary/5" style={cover ? { backgroundImage: `url(${cover})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined} />
                <div className="p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary">{t.label}</span>
                    <span className="rounded-full border px-2 py-0.5 text-xs">{s.label}</span>
                    {p.difficulty && <DifficultyBadge value={p.difficulty} />}
                  </div>
                  <h3 className="mt-2 truncate font-semibold group-hover:text-primary">
                    {segs && segs.length > 0
                      ? segs.map((seg: any, i: number) => (<span key={i} style={seg.gradient ? gradientStyle(seg.gradient) : undefined}>{seg.text}</span>))
                      : p.name}
                  </h3>
                  {p.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.description}</p>}
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
      <AdSlot placement="projects" position="bottom" className="mt-10" />
    </div>
  );
}