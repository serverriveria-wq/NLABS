import { useEffect, useState } from "react";
import { Download, ThumbsUp, User, ExternalLink, Loader2, Star, Clock } from "lucide-react";
import { useSiteSettings } from "@/lib/site-branding";

type GdLevel = {
  name?: string; author?: string; description?: string; difficulty?: string; downloads?: number; likes?: number;
  length?: string; stars?: number; orbs?: number; featured?: boolean; epic?: boolean; coins?: number; songName?: string; songAuthor?: string;
  id?: string | number;
};

/** Caché en memoria para no repetir peticiones a GDBrowser (tiene límite de uso). */
const cache = new Map<string, GdLevel | "error">();

/**
 * Vista previa de un nivel de Geometry Dash usando la API pública de GDBrowser (GDColon).
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
        const r = await fetch(`https://gdbrowser.com/api/level/${id}`, { signal: ctrl.signal });
        if (!r.ok) throw new Error(String(r.status));
        const j = await r.json();
        if (!j || typeof j !== "object" || !("name" in j)) throw new Error("not found");
        cache.set(id, j as GdLevel); setData(j as GdLevel);
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
  const link = `https://gdbrowser.com/${id}`;

  return (
    <div className={"overflow-hidden rounded-2xl border text-white shadow-soft " + className} style={style}>
      <div className="p-5">
        {data === null && <p className="flex items-center gap-2 text-sm text-white/80"><Loader2 className="h-4 w-4 animate-spin" /> Buscando el nivel {id} en GDBrowser…</p>}
        {data === "error" && (
          <p className="text-sm text-white/90">No se pudo cargar el nivel <b>{id}</b> (no existe o GDBrowser no responde ahora). <a className="underline" href={link} target="_blank" rel="noopener noreferrer">Abrir en GDBrowser</a></p>
        )}
        {data && data !== "error" && (
          <>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-xl font-bold leading-tight">{data.name}</h3>
                <p className="mt-0.5 flex items-center gap-1 text-sm text-white/80"><User className="h-3.5 w-3.5" /> por {data.author || "—"} · ID {id}</p>
              </div>
              <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-white/15 px-2.5 py-1 text-xs font-medium hover:bg-white/25"><ExternalLink className="h-3.5 w-3.5" /> GDBrowser</a>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {data.difficulty && <Chip>{data.difficulty}{data.epic ? " · Epic" : data.featured ? " · Featured" : ""}</Chip>}
              {typeof data.stars === "number" && data.stars > 0 && <Chip><Star className="h-3 w-3" /> {data.stars}</Chip>}
              {typeof data.downloads === "number" && <Chip><Download className="h-3 w-3" /> {data.downloads.toLocaleString()}</Chip>}
              {typeof data.likes === "number" && <Chip><ThumbsUp className="h-3 w-3" /> {data.likes.toLocaleString()}</Chip>}
              {data.length && <Chip><Clock className="h-3 w-3" /> {data.length}</Chip>}
              {typeof data.orbs === "number" && data.orbs > 0 && <Chip>{data.orbs} orbs</Chip>}
              {typeof data.coins === "number" && data.coins > 0 && <Chip>{data.coins} monedas</Chip>}
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
