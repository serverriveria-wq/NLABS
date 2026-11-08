import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Github, Trash2 } from "lucide-react";
import { useSiteSettings } from "@/lib/site-branding";
import { callAdmin } from "@/spa/lib/adminApi";
import { MediaInput } from "@/spa/components/MediaInput";
import { SECTION_ICON_KEYS } from "@/spa/components/SectionIcon";
import type { GdTheme } from "@/lib/site-branding";
import { CREATE_CARD_DEFAULTS, type CreateCardCfg } from "@/lib/create-cards";

/** Shell → Branding: fondo de la vista previa de niveles GD e icono de GitHub. */
export function BrandingExtras() {
  const qc = useQueryClient();
  const site = useSiteSettings();
  const [busy, setBusy] = useState(false);

  async function save(key: "gd_preview_bg_url" | "github_icon_url", value: string) {
    setBusy(true);
    try { await callAdmin("updateSiteSettings", { [key]: value }); toast.success(value ? "Actualizado" : "Restablecido"); qc.invalidateQueries({ queryKey: ["site-settings"] }); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  const icons = site.data?.section_icons ?? {};
  async function saveIcon(key: string, value: string) {
    setBusy(true);
    try {
      const next = { ...icons } as Record<string, string>;
      if (value) next[key] = value; else delete next[key];
      await callAdmin("updateSiteSettings", { section_icons: next });
      toast.success(value ? "Icono actualizado" : "Icono restablecido");
      qc.invalidateQueries({ queryKey: ["site-settings"] });
    } catch (e) { toast.error((e as Error).message + " (¿ejecutaste supabase/migration_v4.sql?)"); }
    finally { setBusy(false); }
  }

  const buttons = ((site.data?.create_buttons ?? {}) as Record<string, CreateCardCfg>);
  const [draft, setDraft] = useState<Record<string, CreateCardCfg>>({});
  const val = (key: string, f: keyof CreateCardCfg) => (draft[key]?.[f] ?? buttons[key]?.[f] ?? "") as string;
  const setField = (key: string, f: keyof CreateCardCfg, v: string) => setDraft((d) => ({ ...d, [key]: { ...(d[key] ?? {}), [f]: v } }));
  async function saveButtons(override?: Record<string, CreateCardCfg>) {
    setBusy(true);
    try {
      const merged: Record<string, CreateCardCfg> = { ...buttons };
      for (const [k, v] of Object.entries(draft)) merged[k] = { ...(merged[k] ?? {}), ...v };
      const final = override ?? merged;
      await callAdmin("updateSiteSettings", { create_buttons: final });
      toast.success("Botones de Crear guardados");
      setDraft({});
      qc.invalidateQueries({ queryKey: ["site-settings"] });
    } catch (e) { toast.error((e as Error).message + " (¿ejecutaste supabase/migration_v5.sql?)"); }
    finally { setBusy(false); }
  }

  const theme = (site.data?.gd_theme ?? {}) as GdTheme;
  async function saveTheme(next: GdTheme) {
    setBusy(true);
    try { await callAdmin("updateSiteSettings", { gd_theme: next }); toast.success("Estilo del editor guardado"); qc.invalidateQueries({ queryKey: ["site-settings"] }); }
    catch (e) { toast.error((e as Error).message + " (¿ejecutaste supabase/migration_v6.sql?)"); }
    finally { setBusy(false); }
  }

  const gd = site.data?.gd_preview_bg_url ?? "";
  const gh = site.data?.github_icon_url ?? "";
  return (
    <>
      <div className="rounded-2xl border bg-card p-5 md:col-span-3">
        <h2 className="mb-1 font-semibold">Fondo de la vista previa de niveles GD</h2>
        <p className="mb-3 text-sm text-muted-foreground">Se usa detrás de la tarjeta del nivel (según su ID) en el pie de cada proyecto Collab.</p>
        <MediaInput value={gd} onChange={(v) => save("gd_preview_bg_url", v)} bucket="branding" folder="gd-preview" accept="image/*" preview="image" />
        {gd && <button disabled={busy} onClick={() => save("gd_preview_bg_url", "")} className="btn mt-2"><Trash2 className="h-3.5 w-3.5" /> Quitar fondo</button>}
      </div>
      <div className="rounded-2xl border bg-card p-5 md:col-span-3">
        <h2 className="mb-1 flex items-center gap-2 font-semibold"><Github className="h-4 w-4" /> Icono de GitHub</h2>
        <p className="mb-3 text-sm text-muted-foreground">Aparece al costado del enlace al repositorio en Collabs, Arte y Música. Si no subes ninguno se usa el icono por defecto.</p>
        <MediaInput value={gh} onChange={(v) => save("github_icon_url", v)} bucket="branding" folder="github-icon" accept="image/*" preview="image" />
        {gh && <button disabled={busy} onClick={() => save("github_icon_url", "")} className="btn mt-2"><Trash2 className="h-3.5 w-3.5" /> Usar icono por defecto</button>}
      </div>
    <div className="rounded-2xl border bg-card p-5 md:col-span-3">
        <h2 className="mb-1 font-semibold">Iconos de secciones</h2>
        <p className="mb-4 text-sm text-muted-foreground">Sube un icono propio para cada sección (General, Geometry Dash, Partes, Participantes…). Se ve en las pestañas del editor y en la ficha del proyecto. Recomendado: PNG/SVG cuadrado con fondo transparente.</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SECTION_ICON_KEYS.map(({ key, label }) => (
            <div key={key} className="rounded-xl border p-3">
              <p className="mb-2 text-sm font-medium">{label}</p>
              <MediaInput value={icons[key] ?? ""} onChange={(v) => saveIcon(key, v)} bucket="branding" folder="section-icons" accept="image/*" preview="image" />
              {icons[key] && <button disabled={busy} onClick={() => saveIcon(key, "")} className="btn mt-2"><Trash2 className="h-3.5 w-3.5" /> Icono por defecto</button>}
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border bg-card p-5 md:col-span-3">
        <h2 className="mb-1 font-semibold">Botones de «Crear»</h2>
        <p className="mb-4 text-sm text-muted-foreground">Cambia el título, el texto, el botón, el icono y el fondo (imagen o color) de cada tarjeta de la pestaña Crear. Si dejas un campo vacío se usa el texto por defecto. Mientras la imagen carga, el icono se ve en blanco.</p>
        <div className="grid gap-4 lg:grid-cols-2">
          {CREATE_CARD_DEFAULTS.map((c) => (
            <div key={c.key} className="space-y-2 rounded-xl border p-3">
              <p className="text-sm font-semibold">{c.label}</p>
              <input className="input" placeholder={c.title} value={val(c.key, "title")} onChange={(e) => setField(c.key, "title", e.target.value)} />
              <textarea className="input" rows={2} placeholder={c.description} value={val(c.key, "description")} onChange={(e) => setField(c.key, "description", e.target.value)} />
              <input className="input" placeholder={c.cta} value={val(c.key, "cta")} onChange={(e) => setField(c.key, "cta", e.target.value)} />
              <p className="pt-1 text-xs font-medium text-muted-foreground">Icono</p>
              <MediaInput value={val(c.key, "icon_url")} onChange={(v) => setField(c.key, "icon_url", v)} bucket="branding" folder="create-icons" accept="image/*" preview="image" />
              <p className="pt-1 text-xs font-medium text-muted-foreground">Fondo de la tarjeta (imagen)</p>
              <MediaInput value={val(c.key, "bg_url")} onChange={(v) => setField(c.key, "bg_url", v)} bucket="branding" folder="create-bg" accept="image/*" preview="image" />
              <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-muted-foreground">
                <label className="flex items-center gap-2">Color de fondo
                  <input type="color" value={val(c.key, "bg_color") || "#ffffff"} onChange={(e) => setField(c.key, "bg_color", e.target.value)} className="h-8 w-10 cursor-pointer rounded border p-0.5" />
                  {val(c.key, "bg_color") && <button type="button" onClick={() => setField(c.key, "bg_color", "")} className="underline">quitar</button>}
                </label>
                <label className="flex items-center gap-2">Color del texto
                  <input type="color" value={val(c.key, "text_color") || "#000000"} onChange={(e) => setField(c.key, "text_color", e.target.value)} className="h-8 w-10 cursor-pointer rounded border p-0.5" />
                  {val(c.key, "text_color") && <button type="button" onClick={() => setField(c.key, "text_color", "")} className="underline">quitar</button>}
                </label>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <button disabled={busy} onClick={() => saveButtons()} className="btn bg-primary text-primary-foreground border-primary">Guardar botones</button>
          <button disabled={busy} onClick={() => saveButtons({})} className="btn"><Trash2 className="h-3.5 w-3.5" /> Restablecer todo</button>
        </div>
      </div>
      <div className="rounded-2xl border bg-card p-5 md:col-span-3">
        <h2 className="mb-1 font-semibold">Fuente del editor avanzado (.ttf)</h2>
        <p className="mb-3 text-sm text-muted-foreground">Sube tu fuente (.ttf, .otf o .woff2) y el editor avanzado la usará en todos sus textos. Sin archivo se usa la fuente normal.</p>
        <MediaInput value={theme.font_url ?? ""} onChange={(v) => saveTheme(v ? { font_url: v } : {})} bucket="branding" folder="fonts" accept=".ttf,.otf,.woff,.woff2,font/*" preview="none" />
        {theme.font_url && <button disabled={busy} onClick={() => saveTheme({})} className="btn mt-2"><Trash2 className="h-3.5 w-3.5" /> Quitar fuente</button>}
      </div>
    </>
  );
}
