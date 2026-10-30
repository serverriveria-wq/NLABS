import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink, Link2 } from "lucide-react";

export type SiteLink = {
  id: string;
  title: string;
  description: string | null;
  url: string;
  logo_url: string | null;
  banner_url: string | null;
  order_index: number;
};

export function useSiteLinks() {
  return useQuery({
    queryKey: ["site-links"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_links" as never)
        .select("*")
        .order("order_index")
        .order("created_at");
      return (data ?? []) as unknown as SiteLink[];
    },
  });
}

export default function Linked() {
  const q = useSiteLinks();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
      <Helmet>
        <title>LINKED — Redes del team</title>
        <meta name="description" content="Todas las redes sociales y comunidades oficiales del team en un solo lugar." />
      </Helmet>

      <div className="mb-6 flex items-center gap-2">
        <Link2 className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">LINKED</h1>
      </div>
      <p className="mb-6 text-sm text-muted-foreground">Nuestras redes sociales y comunidades oficiales.</p>

      {q.isLoading && <p className="text-sm text-muted-foreground">Cargando…</p>}
      {!q.isLoading && !q.data?.length && (
        <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">Aún no hay redes publicadas.</div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        {q.data?.map((l) => (
          <article key={l.id} className="overflow-hidden rounded-2xl border bg-card">
            <div className="relative h-28 bg-secondary">
              {l.banner_url && <img src={l.banner_url} alt={`Banner de ${l.title}`} className="h-full w-full object-cover" loading="lazy" />}
              <div className="absolute -bottom-7 left-5 h-16 w-16 overflow-hidden rounded-2xl border-4 border-card bg-muted">
                {l.logo_url ? (
                  <img src={l.logo_url} alt={`Logo de ${l.title}`} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-lg font-bold text-muted-foreground">
                    {l.title.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
            <div className="p-5 pt-10">
              <h2 className="font-semibold">{l.title}</h2>
              {l.description && <p className="mt-1 text-sm text-muted-foreground">{l.description}</p>}
              <a
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                Entrar <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
