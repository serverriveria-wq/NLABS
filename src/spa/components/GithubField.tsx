import { Github } from "lucide-react";
import { useSiteSettings } from "@/lib/site-branding";

/** URL válida de GitHub (https://github.com/usuario/repo). */
export function isGithubUrl(v: string | null | undefined): boolean {
  return !!v && /^https:\/\/(www\.)?github\.com\/[\w.-]+(\/[\w.-]+)?\/?/i.test(v.trim());
}

/** Icono de GitHub: usa el que el admin subió en Shell → Branding; si no hay, el de lucide. */
export function GithubIcon({ className = "h-4 w-4" }: { className?: string }) {
  const site = useSiteSettings();
  const url = site.data?.github_icon_url;
  return url ? <img src={url} alt="GitHub" className={className + " object-contain"} /> : <Github className={className} />;
}

/** Apartado opcional: se activa con un interruptor y, al activarlo, pide el link del repositorio. */
export function GithubField({ enabled, url, onChange }: { enabled: boolean; url: string; onChange: (v: { enabled: boolean; url: string }) => void }) {
  const bad = enabled && url.trim() !== "" && !isGithubUrl(url);
  return (
    <div className="rounded-xl border p-3">
      <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={enabled} onChange={(e) => onChange({ enabled: e.target.checked, url })} />
        <GithubIcon /> Repositorio de GitHub <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
      </label>
      {enabled && (
        <div className="mt-2">
          <input className="input" value={url} onChange={(e) => onChange({ enabled, url: e.target.value })} placeholder="https://github.com/usuario/repositorio" />
          {bad && <p className="mt-1 text-xs text-destructive">Debe ser un enlace de github.com</p>}
        </div>
      )}
    </div>
  );
}

/** Botón/enlace con el icono de GitHub al costado. */
export function GithubLink({ url }: { url: string | null | undefined }) {
  if (!isGithubUrl(url)) return null;
  return (
    <a href={url!} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium hover:bg-accent">
      <GithubIcon className="h-3.5 w-3.5" /> GitHub
    </a>
  );
}

/** Convierte "a, b, c" en lista limpia (máx. 20). */
export const parseList = (v: string): string[] => v.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 20);
