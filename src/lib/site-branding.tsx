import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ReactNode, CSSProperties } from "react";

export type Gradient = { from: string; to: string; direction?: string };

export type SiteSettings = {
  logo_url: string | null;
  favicon_url: string | null;
  preview_button_image_url: string | null;
  site_name: string | null;
  gd_preview_bg_url?: string | null;
  github_icon_url?: string | null;
  section_icons?: Record<string, string> | null;
  create_buttons?: Record<string, { title?: string; description?: string; cta?: string; icon_url?: string; bg_url?: string; bg_color?: string; text_color?: string }> | null;
  gd_theme?: GdTheme | null;
};

/** Fuente propia del editor avanzado. */
export type GdTheme = { font_url?: string };

export function useSiteSettings() {
  return useQuery({
    queryKey: ["site-settings"],
    queryFn: async (): Promise<SiteSettings> => {
      const empty: SiteSettings = { logo_url: null, favicon_url: null, preview_button_image_url: null, site_name: null, gd_preview_bg_url: null, github_icon_url: null, section_icons: {}, create_buttons: {}, gd_theme: {} };
      const base = "logo_url, favicon_url, preview_button_image_url, site_name";
      // Del select más completo al más simple: si una migración aún no se ejecutó, se prueba con menos columnas.
      const tries = [
        `${base}, gd_preview_bg_url, github_icon_url, section_icons, create_buttons, gd_theme`,
        `${base}, gd_preview_bg_url, github_icon_url, section_icons, create_buttons`,
        `${base}, gd_preview_bg_url, github_icon_url, section_icons`,
        `${base}, gd_preview_bg_url, github_icon_url`,
        base,
      ];
      for (const cols of tries) {
        const r = await supabase.from("site_settings" as never).select(cols).eq("id", true).maybeSingle();
        if (!r.error) return { ...empty, ...((r.data as unknown as Partial<SiteSettings> | null) ?? {}) };
      }
      return empty;
    },
    staleTime: 60_000,
  });
}

export type TextOverride = { key: string; value: string; gradient: Gradient | null };

export function useTextOverrides() {
  return useQuery({
    queryKey: ["text-overrides"],
    queryFn: async (): Promise<Record<string, TextOverride>> => {
      const { data } = await supabase.from("text_overrides" as never).select("key,value,gradient");
      const map: Record<string, TextOverride> = {};
      (data as TextOverride[] | null)?.forEach((r) => (map[r.key] = r));
      return map;
    },
    staleTime: 60_000,
  });
}

export function gradientStyle(g: Gradient | null | undefined): CSSProperties | undefined {
  if (!g) return undefined;
  return {
    backgroundImage: `linear-gradient(${g.direction ?? "to right"}, ${g.from}, ${g.to})`,
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
    WebkitTextFillColor: "transparent",
  };
}

export function GradientText({ gradient, children, className }: { gradient?: Gradient | null; children: ReactNode; className?: string }) {
  if (!gradient) return <span className={className}>{children}</span>;
  return <span className={className} style={gradientStyle(gradient)}>{children}</span>;
}

/** Hook that returns { text, gradient } for a given key, falling back to the default text. */
export function useSiteText(key: string, defaultValue: string) {
  const { data } = useTextOverrides();
  const o = data?.[key];
  return { text: o?.value ?? defaultValue, gradient: o?.gradient ?? null };
}

/** Convenience component. */
export function SiteText({ tkey, fallback, className }: { tkey: string; fallback: string; className?: string }) {
  const { text, gradient } = useSiteText(tkey, fallback);
  return <GradientText gradient={gradient} className={className}>{text}</GradientText>;
}
