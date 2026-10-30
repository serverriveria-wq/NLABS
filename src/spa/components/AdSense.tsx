import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AdUnit = {
  id: string;
  name: string;
  network: string;
  code: string;
  placement: string;
  position: string;
  enabled: boolean;
  order_index: number;
};

export const AD_PLACEMENTS = [
  { value: "dashboard", label: "Inicio" },
  { value: "projects", label: "Proyectos" },
  { value: "project", label: "Detalle de proyecto" },
  { value: "more", label: "Más" },
  { value: "linked", label: "Linked" },
  { value: "trophies", label: "Trofeos" },
] as const;

export const AD_POSITIONS = [
  { value: "top", label: "Arriba del contenido" },
  { value: "bottom", label: "Abajo del contenido" },
] as const;

export function useAdUnits() {
  return useQuery({
    queryKey: ["ad-units"],
    queryFn: async (): Promise<AdUnit[]> => {
      const { data } = await supabase
        .from("ad_units" as never)
        .select("*")
        .order("order_index")
        .order("created_at");
      return (data as unknown as AdUnit[] | null) ?? [];
    },
    staleTime: 60_000,
  });
}

/**
 * Inserta el código HTML/JS de Adsterra ejecutando también sus <script>,
 * cosa que `dangerouslySetInnerHTML` no hace por sí solo.
 */
export function AdCodeFrame({ code, className }: { code: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    host.innerHTML = "";
    const tpl = document.createElement("template");
    tpl.innerHTML = code;
    const frag = tpl.content.cloneNode(true) as DocumentFragment;
    // re-crear scripts para que el navegador los ejecute
    frag.querySelectorAll("script").forEach((old) => {
      const s = document.createElement("script");
      for (const a of Array.from(old.attributes)) s.setAttribute(a.name, a.value);
      s.text = old.textContent ?? "";
      old.replaceWith(s);
    });
    host.appendChild(frag);
    return () => { host.innerHTML = ""; };
  }, [code]);

  return <div ref={ref} className={className} />;
}

/** Bloques de anuncios discretos para una página y posición concreta. */
export function AdSlot({
  placement,
  position = "bottom",
  className,
}: {
  placement: string;
  position?: string;
  className?: string;
}) {
  const { data } = useAdUnits();
  const units = (data ?? []).filter(
    (u) => u.enabled && u.placement === placement && u.position === position && u.code.trim(),
  );
  if (!units.length) return null;

  return (
    <div className={className}>
      <p className="mb-1 text-center text-[10px] uppercase tracking-widest text-muted-foreground">Publicidad</p>
      <div className="flex flex-col items-center gap-3">
        {units.map((u) => (
          <AdCodeFrame key={u.id} code={u.code} className="w-full overflow-hidden text-center" />
        ))}
      </div>
    </div>
  );
}
