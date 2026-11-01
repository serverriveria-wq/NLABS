import { useEffect, useState } from "react";
import { Download, ThumbsUp, User, ExternalLink, Loader2, Star, Clock } from "lucide-react";
import { useSiteSettings } from "@/lib/site-branding";
import { SectionIcon } from "@/spa/components/SectionIcon";

type GdLevel = {
  name?: string; author?: string; description?: string; difficulty?: string; downloads?: number; likes?: number;
  length?: string; stars?: number; featured?: boolean; epic?: boolean; songName?: string; songAuthor?: string;
};

/** Caché en memoria para no repetir peticiones a la API. */
const cache = new Map<string, GdLevel | "error">();

const LENGTHS = ["Tiny", "Short", "Medium", "Long", "XL", "Platformer"];

/** Primer valor definido entre varios objetos y posibles nombres de campo. */
function pick(objs: Array<Record<string, any> | undefined>, keys: string[]): any {
  for (const o of objs) {
    if (!o || typeof o !== "object") continue;
    for (const k of keys) { const v = o[k]; if (v !== undefined && v !== null && v !== "") return v; }
  }
  return undefined;
}
const num = (v: any): number | undefined => (v === undefined || v === null || v === "" || isNaN(Number(v)) ? undefined : Number(v));

/** Convierte la respuesta de GDHistory (los nombres de campo pueden variar) en un nivel simple. */
function normalize(j: any): GdLevel | null {
  if (!j || typeof j !== "object" || j.success === false) return null;
  const rec = Array.isArray(j.records) ? j.records[0] : undefined;
  const srcs = [j, j.level, j.data, rec];
  const length = pick(srcs, ["cache_length", "length"]);
  const diff = pick(srcs, ["cache_difficulty_name", "difficulty_name", "difficulty_text", "difficulty"]);
  return {
    name: pick(srcs, ["cache_level_name", "level_name", "cache_name", "name", "title"]),
    author: pick(srcs, ["cache_username", "username", "author", "creator", "cache_author", "cache_creator"]),
    description: pick(srcs, ["cache_description", "description"]),
    difficulty: typeof diff === "string" ? diff : undefined,
    downloads: num(pick(srcs, ["cache_downloads", "downloads"])),
    likes: num(pick(srcs, ["cache_likes", "likes"])),
    stars: num(pick(srcs, ["cache_stars", "stars", "cache_filter_stars"])),
    length: typeof length === "string" ? length : num(length) !== undefined ? LENGTHS[num(length)!] : undefined,
    featured: !!pick(srcs, ["cache_featured", "featured"]),
    epic: !!pick(srcs, ["cache_epic", "epic"]),
    songName: pick(srcs, ["cache_song_name", "song_name", "song"]),
    songAuthor: pick(srcs, ["cache_song_author", "song_author"]),
  };
}

/**
 * Vista previa de un nivel de Geometry Dash usando la API de GDHistory (history.geometrydash.eu).
 * El fondo se edita desde Shell → Branding ("Fondo de la vista previa de GD").
 */
export function GdLevelPreview({ levelId, className = "" }: { levelId: string | number | null | undefined; className?: string }) {
  const id = String(levelId ?? "").trim();
  const valid = /^\d{1,10}$/.test(id);
  const site = useSiteSettings();
  const [data, setData] = useState<GdLevel | "error" | null>(null);

  useEffect(() => {
    if (!valid) { setData(null); return; }
    if (cache.has(id)) { setData(cache.get(id)!); return; }
    setData(null);
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        let lvl: GdLevel | null = null;
        try {
          // 1) Puente en nuestro propio servidor (Vercel): evita bloqueos CORS y lee la API o la página del nivel.
          const r = await fetch(`/api/gdlevel?id=${id}`, { signal: ctrl.signal });
          const ct = r.headers.get("content-type") || "";
          if (r.ok && ct.includes("json")) {
            const j = await r.json();
            if (j?.ok && j.level) lvl = j.level as GdLevel;
          } else if (r.status === 404 && ct.includes("json")) {
            throw new Error("not found");
          }
        } catch (e) {
          if ((e as Error).name === "AbortError" || (e as Error).message === "not found") throw e;
        }
        // 2) Plan B: llamada directa desde el navegador (por si el puente no está disponible).
        if (!lvl) {
          const r = await fetch(`https://history.geometrydash.eu/api/v1/level/${id}/brief`, { signal: ctrl.signal });
          if (!r.ok) throw new Error(String(r.status));
          lvl = normalize(await r.json());
        }
        if (!lvl) throw new Error("not found");
        cache.set(id, lvl); setData(lvl);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        cache.set(id, "error"); setData("error");
      }
    }, 500); // pequeña espera mientras escribes el ID
    return () => { clearTimeout(timer); ctrl.abort(); };
  }, [id, valid]);

  if (!valid) return null;
  const bg = site.data?.gd_preview_bg_url;
  const style = bg
    ? { backgroundImage: `linear-gradient(rgba(0,0,0,.55), rgba(0,0,0,.75)), url(${bg})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { backgroundImage: "linear-gradient(135deg, #1e1b4b, #312e81 55%, #0f172a)" };
  const link = `https://history.geometrydash.eu/level/${id}`;

  return (
    <div className={"overflow-hidden rounded-2xl border text-white shadow-soft " + className} style={style}>
      <div className="p-5">
        {data === null && <p className="flex items-center gap-2 text-sm text-white/80"><Loader2 className="h-4 w-4 animate-spin" /> Buscando el nivel {id} en GDHistory…</p>}
        {data === "error" && (
          <p className="text-sm text-white/90">No se pudo cargar el nivel <b>{id}</b> (no tiene registros en GDHistory o la API no responde ahora). <a className="underline" href={link} target="_blank" rel="noopener noreferrer">Abrir en GDHistory</a></p>
        )}
        {data && data !== "error" && (
          <>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="flex items-center gap-2 text-xl font-bold leading-tight"><SectionIcon k="gd" fallback={Star} className="h-5 w-5" /> {data.name || `Nivel ${id}`}</h3>
                <p className="mt-0.5 flex items-center gap-1 text-sm text-white/80"><User className="h-3.5 w-3.5" /> por {data.author || "—"} · ID {id}</p>
              </div>
              <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-white/15 px-2.5 py-1 text-xs font-medium hover:bg-white/25"><ExternalLink className="h-3.5 w-3.5" /> GDHistory</a>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {data.difficulty && <Chip>{data.difficulty}{data.epic ? " · Epic" : data.featured ? " · Featured" : ""}</Chip>}
              {typeof data.stars === "number" && data.stars > 0 && <Chip><Star className="h-3 w-3" /> {data.stars}</Chip>}
              {typeof data.downloads === "number" && <Chip><Download className="h-3 w-3" /> {data.downloads.toLocaleString()}</Chip>}
              {typeof data.likes === "number" && <Chip><ThumbsUp className="h-3 w-3" /> {data.likes.toLocaleString()}</Chip>}
              {data.length && <Chip><Clock className="h-3 w-3" /> {data.length}</Chip>}
            </div>
            {data.songName && <p className="mt-3 text-xs text-white/80">🎵 {data.songName}{data.songAuthor ? ` — ${data.songAuthor}` : ""}</p>}
            {data.description && <p className="mt-2 line-clamp-3 text-sm text-white/85">{data.description}</p>}
          </>
        )}
      </div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 font-medium">{children}</span>;
}
