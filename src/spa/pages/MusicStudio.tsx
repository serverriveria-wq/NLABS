import { useEffect, useMemo, useRef, useState } from "react";
import { GithubField, GithubLink, parseList } from "@/spa/components/GithubField";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Music, Loader2, Pause, Pencil, Play, Plus, Search, Trash2, Volume2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { pathFromSigned, uploadAndSign } from "@/lib/storage";
import { Modal } from "@/spa/components/Modal";
import { Button } from "@/components/ui/button";

const db = supabase as unknown as { from: (t: string) => any; channel: (n: string) => any; removeChannel: (c: unknown) => void };
const GENRES = ["Electrónica", "Dubstep", "Drum & Bass", "Trance", "Rock", "Orquestal", "Chiptune", "Lo-fi", "Hardstyle", "Otro"];
const VIS: Record<string, string> = { team: "Equipo", public: "Público", private: "Privado (solo yo)" };
type Track = { id: string; author_id: string; title: string; artist: string | null; description: string | null; genre: string | null; bpm: number | null; duration_seconds: number | null; audio_url: string | null; external_url: string | null; cover_url: string | null; project_id: string | null; credits: string | null; license: string | null; visibility: string; created_at: string };
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export default function MusicStudio() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState("");
  const [mine, setMine] = useState(false);
  const [edit, setEdit] = useState<Track | "new" | null>(null);
  const [playing, setPlaying] = useState<Track | null>(null);

  const me = useQuery({ queryKey: ["me-id"], queryFn: async () => (await supabase.auth.getUser()).data.user?.id ?? null });
  const tracks = useQuery({ queryKey: ["music"], queryFn: async (): Promise<Track[]> => { const { data, error } = await db.from("music_tracks").select("*").order("created_at", { ascending: false }); if (error) throw error; return data; } });
  const people = useQuery({ queryKey: ["people-map"], queryFn: async () => { const { data } = await supabase.from("profiles").select("id, username, display_name"); return Object.fromEntries((data ?? []).map((p) => [p.id, p.display_name || p.username])); } });
  const projects = useQuery({ queryKey: ["projects-min"], queryFn: async () => { const { data } = await supabase.from("projects").select("id, name").order("name"); return data ?? []; } });
  const isAdmin = useQuery({ queryKey: ["is-admin"], queryFn: async () => { const { data } = await supabase.from("user_roles").select("role"); return (data ?? []).some((r) => ["founder", "owner", "administrator"].includes(r.role)); } });
  useEffect(() => {
    const ch = db.channel("music-live").on("postgres_changes", { event: "*", schema: "public", table: "music_tracks" }, () => qc.invalidateQueries({ queryKey: ["music"] })).subscribe();
    return () => db.removeChannel(ch);
  }, [qc]);

  const list = useMemo(() => (tracks.data ?? []).filter((t) =>
    (!genre || t.genre === genre) && (!mine || t.author_id === me.data) &&
    (t.title + " " + (t.artist ?? "") + " " + (t.description ?? "")).toLowerCase().includes(search.toLowerCase())), [tracks.data, genre, mine, search, me.data]);
  const can = (t: Track) => t.author_id === me.data || isAdmin.data;
  const proj = (id: string | null) => (projects.data ?? []).find((p) => p.id === id)?.name;

  async function remove(t: Track) {
    if (!window.confirm(`¿Eliminar «${t.title}»?`)) return;
    const { error } = await db.from("music_tracks").delete().eq("id", t.id);
    if (error) return toast.error(error.message);
    const a = pathFromSigned(t.audio_url, "music"), c = pathFromSigned(t.cover_url, "music");
    const rm = [a, c].filter(Boolean) as string[]; if (rm.length) await supabase.storage.from("music").remove(rm);
    if (playing?.id === t.id) setPlaying(null);
    toast.success("Pista eliminada"); qc.invalidateQueries({ queryKey: ["music"] });
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 pb-28 md:px-8">
      <Helmet><title>Música — NLabs</title></Helmet>
      <Link to="/createcolab" className="text-xs text-muted-foreground hover:text-foreground">← Crear</Link>
      <div className="mb-4 mt-1 flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight"><Music className="h-6 w-6 text-primary" /> Biblioteca musical</h1><p className="text-sm text-muted-foreground">Composiciones, canciones y recursos de audio del team.</p></div>
        <Button onClick={() => setEdit("new")} className="gap-1.5"><Plus className="h-4 w-4" /> Subir música</Button>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-52 flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><input className="input !pl-9" placeholder="Buscar título, artista…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <select className="input !w-auto" value={genre} onChange={(e) => setGenre(e.target.value)}><option value="">Todos los géneros</option>{GENRES.map((g) => <option key={g}>{g}</option>)}</select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} /> Solo las mías</label>
      </div>
      {tracks.isLoading ? <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-secondary" />)}</div>
        : tracks.error ? <p className="text-sm text-destructive">No se pudo cargar la biblioteca.</p>
        : list.length === 0 ? <div className="rounded-2xl border bg-card p-10 text-center text-sm text-muted-foreground"><Music className="mx-auto mb-2 h-8 w-8 opacity-40" />{(tracks.data?.length ?? 0) === 0 ? "Aún no hay música. ¡Sube la primera!" : "Nada coincide con tu búsqueda."}</div>
        : (
          <ul className="space-y-2">
            {list.map((t) => (
              <li key={t.id} className={"flex items-center gap-3 rounded-2xl border bg-card p-3 " + (playing?.id === t.id ? "border-primary" : "")}>
                {t.cover_url ? <img src={t.cover_url} alt="" className="h-14 w-14 rounded-xl object-cover" /> : <div className="grid h-14 w-14 place-items-center rounded-xl bg-primary-soft"><Music className="h-6 w-6 text-primary" /></div>}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{t.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{t.artist || people.data?.[t.author_id] || "—"}{t.genre ? ` · ${t.genre}` : ""}{t.bpm ? ` · ${t.bpm} BPM` : ""}{t.duration_seconds ? ` · ${fmt(t.duration_seconds)}` : ""}{t.visibility === "private" ? " · 🔒" : ""}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{t.license ? `Licencia: ${t.license}` : ""}{t.credits ? ` · Créditos: ${t.credits}` : ""}{proj(t.project_id) ? ` · Proyecto: ${proj(t.project_id)}` : ""}</p>
                  {(((t as any).tools?.length ?? 0) > 0 || ((t as any).dependencies?.length ?? 0) > 0 || (t as any).musical_key) && <p className="truncate text-[11px] text-muted-foreground">{(t as any).musical_key ? `Tono: ${(t as any).musical_key} · ` : ""}{((t as any).tools?.length ?? 0) > 0 ? `Herramientas: ${(t as any).tools.join(", ")}` : ""}{((t as any).dependencies?.length ?? 0) > 0 ? ` · Dependencias: ${(t as any).dependencies.join(", ")}` : ""}</p>}
                </div>
                {t.audio_url ? <Button size="icon" variant="outline" aria-label={playing?.id === t.id ? "Pausar" : "Reproducir"} onClick={() => setPlaying(playing?.id === t.id ? null : t)}>{playing?.id === t.id ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</Button> : null}
                {(t as any).github_enabled && <GithubLink url={(t as any).github_url} />}
                {t.external_url && <a href={t.external_url} target="_blank" rel="noopener noreferrer" aria-label="Abrir enlace" className="rounded-md border p-2 hover:bg-accent"><ExternalLink className="h-4 w-4" /></a>}
                {can(t) && <><button aria-label="Editar" onClick={() => setEdit(t)} className="rounded-md p-2 hover:bg-accent"><Pencil className="h-4 w-4" /></button><button aria-label="Eliminar" onClick={() => remove(t)} className="rounded-md p-2 text-destructive hover:bg-accent"><Trash2 className="h-4 w-4" /></button></>}
              </li>
            ))}
          </ul>
        )}
      {playing && <Player track={playing} onClose={() => setPlaying(null)} />}
      {edit && <MusicForm item={edit === "new" ? null : edit} projects={projects.data ?? []} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); qc.invalidateQueries({ queryKey: ["music"] }); }} />}
    </div>
  );
}

function Player({ track, onClose }: { track: Track; onClose: () => void }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [on, setOn] = useState(false);
  const [t, setT] = useState(0);
  const [d, setD] = useState(0);
  const [vol, setVol] = useState(0.8);
  useEffect(() => { const a = ref.current; if (a) { a.volume = vol; a.play().then(() => setOn(true)).catch(() => setOn(false)); } }, [track.id]); // eslint-disable-line
  useEffect(() => { if (ref.current) ref.current.volume = vol; }, [vol]);
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 p-3 shadow-lg backdrop-blur">
      <audio ref={ref} src={track.audio_url ?? undefined} onTimeUpdate={(e) => setT(e.currentTarget.currentTime)} onLoadedMetadata={(e) => setD(e.currentTarget.duration)} onEnded={() => setOn(false)} />
      <div className="mx-auto flex max-w-4xl items-center gap-3">
        <Button size="icon" onClick={() => { const a = ref.current!; if (a.paused) { a.play(); setOn(true); } else { a.pause(); setOn(false); } }} aria-label={on ? "Pausar" : "Reproducir"}>{on ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</Button>
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{track.title}</p>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground"><span>{fmt(t)}</span><input type="range" min={0} max={d || 1} step={0.1} value={t} onChange={(e) => { if (ref.current) ref.current.currentTime = Number(e.target.value); }} className="flex-1 accent-[var(--color-primary)]" aria-label="Progreso" /><span>{fmt(d)}</span></div></div>
        <Volume2 className="hidden h-4 w-4 text-muted-foreground sm:block" /><input type="range" min={0} max={1} step={0.05} value={vol} onChange={(e) => setVol(Number(e.target.value))} className="hidden w-24 accent-[var(--color-primary)] sm:block" aria-label="Volumen" />
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">Cerrar</button>
      </div>
    </div>
  );
}

function L({ t, children }: { t: string; children: React.ReactNode }) { return <label className="block"><span className="mb-1 block text-xs text-muted-foreground">{t}</span>{children}</label>; }

function MusicForm({ item, projects, onClose, onSaved }: { item: Track | null; projects: { id: string; name: string }[]; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ title: item?.title ?? "", artist: item?.artist ?? "", description: item?.description ?? "", genre: item?.genre ?? "", bpm: item?.bpm?.toString() ?? "", duration: item?.duration_seconds?.toString() ?? "", ext: item?.external_url ?? "", project_id: item?.project_id ?? "", credits: item?.credits ?? "", license: item?.license ?? "", visibility: item?.visibility ?? "team" });
  const [audio, setAudio] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [rights, setRights] = useState(false);
  const [busy, setBusy] = useState(false);
  const [x, setX] = useState({ tools: ((item as any)?.tools ?? []).join(", "), deps: ((item as any)?.dependencies ?? []).join(", "), key: (item as any)?.musical_key ?? "", gh: !!(item as any)?.github_enabled, ghUrl: (item as any)?.github_url ?? "" });
  const setx = (k: string, v: string) => setX((p) => ({ ...p, [k]: v }));
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  function pickAudio(x: File | undefined) {
    if (!x) return;
    if (!/^audio\/(mpeg|mp3|ogg|wav|x-wav|mp4|x-m4a|aac)$/.test(x.type)) return toast.error("Formato no permitido (MP3, OGG, WAV o M4A).");
    if (x.size > 25 * 1024 * 1024) return toast.error("Máximo 25 MB.");
    setAudio(x);
    const a = new Audio(URL.createObjectURL(x));
    a.onloadedmetadata = () => { if (isFinite(a.duration) && !f.duration) set("duration", String(Math.round(a.duration))); };
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.title.trim()) return toast.error("Pon un título.");
    if (x.gh && x.ghUrl.trim() && !/^https:\/\/(www\.)?github\.com\//i.test(x.ghUrl.trim())) return toast.error("El enlace de GitHub debe empezar por https://github.com/");
    if (f.ext && !/^https:\/\//.test(f.ext)) return toast.error("El enlace debe empezar por https://");
    if (!audio && !item?.audio_url && !f.ext) return toast.error("Sube un audio o pega un enlace externo.");
    if (audio && !rights) return toast.error("Confirma que tienes derecho a distribuir este audio.");
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser(); const uid = u.user!.id;
      let audio_url = item?.audio_url ?? null, cover_url = item?.cover_url ?? null;
      if (audio) { audio_url = await uploadAndSign("music", audio, uid); const o = pathFromSigned(item?.audio_url, "music"); if (o) await supabase.storage.from("music").remove([o]); }
      if (cover) { if (!cover.type.startsWith("image/") || cover.size > 5 * 1024 * 1024) throw new Error("La portada debe ser una imagen de hasta 5 MB."); cover_url = await uploadAndSign("music", cover, uid); }
      const n = (v: string) => (v === "" ? null : Number(v));
      const row = { tools: parseList(x.tools), dependencies: parseList(x.deps), musical_key: x.key || null, github_enabled: x.gh, github_url: x.gh ? (x.ghUrl.trim() || null) : null, title: f.title.trim(), artist: f.artist || null, description: f.description || null, genre: f.genre || null, bpm: n(f.bpm), duration_seconds: n(f.duration), audio_url, external_url: f.ext || null, cover_url, project_id: f.project_id || null, credits: f.credits || null, license: f.license || null, visibility: f.visibility };
      const { error } = item ? await db.from("music_tracks").update(row).eq("id", item.id) : await db.from("music_tracks").insert(row);
      if (error) throw error;
      toast.success(item ? "Pista actualizada" : "Pista publicada"); onSaved();
    } catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  }
  return (
    <Modal onClose={onClose} title={item ? "Editar pista" : "Subir música"}>
      <form onSubmit={submit} className="space-y-3">
        <L t="Título *"><input className="input" maxLength={100} value={f.title} onChange={(e) => set("title", e.target.value)} /></L>
        <div className="grid gap-3 sm:grid-cols-2">
          <L t="Artista / compositor"><input className="input" value={f.artist} onChange={(e) => set("artist", e.target.value)} /></L>
          <L t="Género"><select className="input" value={f.genre} onChange={(e) => set("genre", e.target.value)}><option value="">—</option>{GENRES.map((g) => <option key={g}>{g}</option>)}</select></L>
          <L t="BPM"><input type="number" min={1} max={1000} className="input" value={f.bpm} onChange={(e) => set("bpm", e.target.value)} /></L>
          <L t="Duración (segundos)"><input type="number" min={0} className="input" value={f.duration} onChange={(e) => set("duration", e.target.value)} /></L>
        </div>
        <L t="Descripción"><textarea className="input" rows={2} value={f.description} onChange={(e) => set("description", e.target.value)} /></L>
        <L t={`Archivo de audio (MP3/OGG/WAV/M4A, máx. 25 MB)${item?.audio_url ? " — opcional: reemplazar" : ""}`}><input type="file" accept="audio/mpeg,audio/ogg,audio/wav,audio/mp4,audio/x-m4a,audio/aac" className="input" onChange={(e) => pickAudio(e.target.files?.[0])} /></L>
        {audio && <label className="flex items-start gap-2 text-xs"><input type="checkbox" checked={rights} onChange={(e) => setRights(e.target.checked)} className="mt-0.5" /> Confirmo que tengo derecho a subir y compartir este audio con el team.</label>}
        <L t="O enlace externo (https://) — si no puedes alojar el archivo"><input className="input" value={f.ext} onChange={(e) => set("ext", e.target.value)} placeholder="Newgrounds, YouTube, SoundCloud…" /></L>
        <L t="Portada (imagen opcional)"><input type="file" accept="image/*" className="input" onChange={(e) => setCover(e.target.files?.[0] ?? null)} /></L>
        <div className="grid gap-3 sm:grid-cols-2">
          <L t="Proyecto relacionado"><select className="input" value={f.project_id} onChange={(e) => set("project_id", e.target.value)}><option value="">Ninguno</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></L>
          <L t="Visibilidad"><select className="input" value={f.visibility} onChange={(e) => set("visibility", e.target.value)}>{Object.entries(VIS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></L>
          <L t="Créditos"><input className="input" value={f.credits} onChange={(e) => set("credits", e.target.value)} /></L>
          <L t="Licencia"><input className="input" value={f.license} onChange={(e) => set("license", e.target.value)} placeholder="CC BY, uso interno…" /></L>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <L t="Herramientas / DAW (coma)"><input className="input" value={x.tools} onChange={(e) => setx("tools", e.target.value)} placeholder="FL Studio, Serum, Ableton…" /></L>
          <L t="Dependencias (coma)"><input className="input" value={x.deps} onChange={(e) => setx("deps", e.target.value)} placeholder="Samples, VST, librerías…" /></L>
          <L t="Tonalidad"><input className="input" value={x.key} onChange={(e) => setx("key", e.target.value)} placeholder="Am, C#m, F mayor…" /></L>
        </div>
        <GithubField enabled={x.gh} url={x.ghUrl} onChange={(v) => setX((p) => ({ ...p, gh: v.enabled, ghUrl: v.url }))} />
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button disabled={busy} className="gap-1.5">{busy && <Loader2 className="h-4 w-4 animate-spin" />}{item ? "Guardar cambios" : "Publicar"}</Button></div>
      </form>
    </Modal>
  );
}
