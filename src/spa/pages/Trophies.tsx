import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { Trophy, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function TrophiesPage() {
  const q = useQuery({
    queryKey: ["site-trophies"],
    queryFn: async () =>
      ((await supabase.from("site_trophies" as never).select("*").order("order_index").order("created_at")).data ?? []) as any[],
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
      <Helmet><title>Trofeos — NLab</title></Helmet>
      <div className="mb-6 flex items-center gap-2">
        <Trophy className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">Trofeos</h1>
      </div>

      {q.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : (q.data ?? []).length === 0 ? (
        <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
          Todavía no hay trofeos publicados.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(q.data ?? []).map((t) => (
            <div key={t.id} className="overflow-hidden rounded-2xl border bg-card">
              {t.image_url ? (
                <img src={t.image_url} alt={t.title} className="h-40 w-full object-cover" loading="lazy" />
              ) : (
                <div className="grid h-40 w-full place-items-center bg-secondary text-muted-foreground">
                  <Trophy className="h-8 w-8" />
                </div>
              )}
              <div className="space-y-1 p-4">
                <p className="font-semibold">{t.title}</p>
                {t.awarded_to && <p className="text-xs text-muted-foreground">Otorgado a: {t.awarded_to}</p>}
                {t.awarded_at && <p className="text-xs text-muted-foreground">{t.awarded_at}</p>}
                {t.description && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{t.description}</p>}
                {t.url && (
                  <a href={t.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 pt-1 text-xs text-primary underline">
                    Ver más <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
