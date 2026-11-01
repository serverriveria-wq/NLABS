// Puente a GDHistory (history.geometrydash.eu): lo llama la vista previa de niveles GD.
// Se hace desde el servidor para evitar bloqueos CORS del navegador y para poder
// leer la API aunque cambien los nombres de campo (o caer a la página web del nivel).
const BASE = "https://history.geometrydash.eu";
const HEAD = { "User-Agent": "NLabs/1.0 (level preview)", Accept: "application/json, text/html;q=0.8" };
const LENGTHS = ["Tiny", "Short", "Medium", "Long", "XL", "Platformer"];

const num = (v) => (v === undefined || v === null || v === "" || isNaN(Number(v)) ? undefined : Number(v));

/** Busca una clave (por orden de prioridad) en el objeto, bajando hasta 5 niveles. */
function find(root, names) {
  for (const name of names) {
    const queue = [root];
    for (let depth = 0; queue.length && depth < 6; depth++) {
      const next = [];
      for (const o of queue) {
        if (!o || typeof o !== "object") continue;
        if (!Array.isArray(o) && o[name] !== undefined && o[name] !== null && o[name] !== "") return o[name];
        for (const v of Object.values(o)) if (v && typeof v === "object") next.push(v);
      }
      queue.length = 0; queue.push(...next);
    }
  }
  return undefined;
}

function fromJson(j) {
  if (!j || typeof j !== "object" || j.success === false) return null;
  const length = find(j, ["cache_length", "length", "level_length"]);
  const diff = find(j, ["cache_difficulty_name", "difficulty_name", "difficulty_text", "difficulty"]);
  const lvl = {
    name: find(j, ["cache_level_name", "level_name", "cache_name", "name", "title"]),
    author: find(j, ["cache_username", "cache_author", "cache_creator", "username", "author", "creator", "creator_name"]),
    description: find(j, ["cache_description", "description"]),
    difficulty: typeof diff === "string" ? diff : undefined,
    downloads: num(find(j, ["cache_downloads", "downloads"])),
    likes: num(find(j, ["cache_likes", "likes"])),
    stars: num(find(j, ["cache_stars", "stars", "cache_filter_stars"])),
    length: typeof length === "string" ? length : num(length) !== undefined ? LENGTHS[num(length)] : undefined,
    featured: !!find(j, ["cache_featured", "featured"]),
    epic: !!find(j, ["cache_epic", "epic"]),
    songName: find(j, ["cache_song_name", "song_name", "song_title"]),
    songAuthor: find(j, ["cache_song_author", "song_author", "song_artist"]),
  };
  return typeof lvl.name === "string" && lvl.name ? lvl : null;
}

const decode = (t) => t.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&nbsp;/g, " ");

/** Lee la página web del nivel (la que sí te funciona en el navegador). */
function fromHtml(html) {
  const text = decode(
    html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")
  ).replace(/\s+/g, " ").trim();
  const m = (re) => { const r = text.match(re); return r ? r[1].trim() : undefined; };
  const name = m(/Level Name\s*\|?\s*(.+?)\s*\|?\s+Author\b/);
  if (!name) return null;
  const diffRaw = m(/Difficulty\s*\|?\s*(.+?)\s*\|?\s+Featured\b/);
  const stars = diffRaw ? num((diffRaw.match(/\((\d+)\*\)/) || [])[1]) : undefined;
  const song = m(/Song:\s*(.+?)\s+\(ID:\s*\d+\)/);
  let songName = song, songAuthor;
  if (song && song.includes(" by ")) { const k = song.lastIndexOf(" by "); songName = song.slice(0, k); songAuthor = song.slice(k + 4); }
  return {
    name,
    author: m(/Author\s*\|?\s*(.+?)\s*\|?\s+Downloads\b/),
    description: m(/Description:\s*(.+?)\s+Song:/) || m(/Description:\s*(.+?)\s+Saved on\b/),
    difficulty: diffRaw ? diffRaw.replace(/\s*\(\d+\*\)\s*/, "").trim() : undefined,
    downloads: num(m(/Downloads\s*\|?\s*(\d+)/)),
    likes: num(m(/Likes\s*\|?\s*(\d+)/)),
    stars: stars && stars > 0 ? stars : undefined,
    length: m(/Length\s*\|?\s*([A-Za-z]+)/),
    featured: /Featured\s*\|?\s*✅/.test(text),
    songName, songAuthor,
  };
}

async function get(url, ms = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { headers: HEAD, signal: ctrl.signal, redirect: "follow" }); } finally { clearTimeout(t); }
}

export default async function handler(req, res) {
  const id = String((req.query && req.query.id) || "").trim();
  if (!/^\d{1,10}$/.test(id)) return res.status(400).json({ ok: false, error: "ID inválido" });
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  const debug = {};
  try {
    const r = await get(`${BASE}/api/v1/level/${id}/brief`);
    debug.api = r.status;
    if (r.ok) {
      const j = await r.json().catch(() => null);
      debug.apiKeys = j && typeof j === "object" ? Object.keys(j).slice(0, 40) : null;
      const level = fromJson(j);
      if (level) return res.status(200).json({ ok: true, source: "api", level });
    }
  } catch (e) { debug.apiError = String(e); }
  try {
    const r = await get(`${BASE}/level/${id}/`);
    debug.html = r.status;
    if (r.ok) {
      const level = fromHtml(await r.text());
      if (level) return res.status(200).json({ ok: true, source: "html", level });
    }
  } catch (e) { debug.htmlError = String(e); }
  return res.status(404).json({ ok: false, error: "Nivel no encontrado en GDHistory", ...(req.query.debug ? { debug } : {}) });
}
