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
};

export function useSiteSettings() {
  return useQuery({
    queryKey: ["site-settings"],
    queryFn: async (): Promise<SiteSettings> => {
      const empty: SiteSettings = { logo_url: null, favicon_url: null, preview_button_image_url: null, site_name: null, gd_preview_bg_url: null, github_icon_url: null };
      const t = () => supabase.from("site_settings" as never);
      // Si la migración v2 aún no se ejecutó, las columnas nuevas no existen: caemos al select antiguo.
      const full = await t().select("logo_url, favicon_url, preview_button_image_url, site_name, gd_preview_bg_url, github_icon_url").eq("id", true).maybeSingle();
      if (!full.error) return { ...empty, ...((full.data as unknown as Partial<SiteSettings> | null) ?? {}) };
      const base = await t().select("logo_url, favicon_url, preview_button_image_url, site_name").eq("id", true).maybeSingle();
      return { ...empty, ...((base.data as unknown as Partial<SiteSettings> | null) ?? {}) };
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
