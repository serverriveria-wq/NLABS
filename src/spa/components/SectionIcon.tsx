import type { ComponentType } from "react";
import { useSiteSettings } from "@/lib/site-branding";

/** Secciones cuyo icono se puede personalizar desde Shell → Branding → Iconos de secciones. */
export const SECTION_ICON_KEYS: { key: string; label: string }[] = [
  { key: "general", label: "General" },
  { key: "gd", label: "Geometry Dash" },
  { key: "parts", label: "Partes" },
  { key: "participants", label: "Participantes" },
  { key: "team", label: "Equipo y reglas" },
  { key: "deps", label: "Dependencias" },
  { key: "tools", label: "Herramientas" },
  { key: "res", label: "Recursos" },
  { key: "preview", label: "Vista previa" },
  { key: "gallery", label: "Galería" },
  { key: "credits", label: "Créditos" },
  { key: "activity", label: "Actividad" },
];

type IconCmp = ComponentType<{ className?: string }>;

/** Muestra el icono personalizado de la sección si el admin subió uno; si no, el icono por defecto. */
export function SectionIcon({ k, fallback: Fallback, className = "h-4 w-4" }: { k: string; fallback: IconCmp; className?: string }) {
  const site = useSiteSettings();
  const url = site.data?.section_icons?.[k];
  return url ? <img src={url} alt="" className={className + " rounded object-contain"} /> : <Fallback className={className} />;
}
