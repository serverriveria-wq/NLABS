import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { History, Sparkles, ImageIcon, ExternalLink, Heart, Trophy } from "lucide-react";
import { RichText } from "@/spa/components/RichText";
import { AdSlot } from "@/spa/components/AdSense";

type Version = { id: string; version: string; released_at: string | null; notes: string | null; order_index: number };
type Credit = { id: string; name: string; role: string | null; image_url: string | null; url: string | null; order_index: number };
type Dedication = { id: string; title: string; target_name: string | null; message: string | null; image_url: string | null; url: string | null; order_index: number };
type Honor = { id: string; name: string; role: string | null; reason: string | null; image_url: string | null; url: string | null; kind: string; order_index: number };

export default function More() {
  const versions = useQuery({
    queryKey: ["site-versions"],
    queryFn: async () =>
      (await supabase.from("site_versions" as never).select("*").order("order_index").order("released_at", { ascending: false })).data as Version[] | null,
  });
  const credits = useQuery({
    queryKey: ["site-credits"],
    queryFn: async () =>
      (await supabase.from("site_credits" as never).select("*").order("order_index").order("name")).data as Credit[] | null,
  });
  const dedications = useQuery({
    queryKey: ["site-dedications"],
    queryFn: async () =>
      (await supabase.from("site_dedications" as never).select("*").order("order_index").order("created_at")).data as Dedication[] | null,
  });
  const honors = useQuery({
    queryKey: ["site-honors"],
    queryFn: async () =>
      (await supabase.from("site_honors" as never).select("*").order("order_index").order("created_at")).data as Honor[] | null,
  });
  const memorables = (honors.data ?? []).filter((h) => h.kind !== "retirado");
  const retirados = (honors.data ?? []).filter((h) => h.kind === "retirado");

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
      <Helmet><title>Más — NLab</title></Helmet>
      <AdSlot placement="more" position="top" className="mb-6" />
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Más</h1>
      <p className="mt-1 text-sm text-muted-foreground">Historial de versiones y créditos del proyecto.</p>

      <section className="mt-8">
        <div className="mb-3 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Cuadro de honor</h2>
        </div>
        {honors.isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : honors.data && honors.data.length ? (
          <div className="space-y-6">
            {[
              { title: "Jugadores memorables", list: memorables },
              { title: "Retirados del team", list: retirados },
            ].filter((g) => g.list.length).map((g) => (
              <div key={g.title}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.title}</p>
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                  {g.list.map((h) => (
                    <a
                      key={h.id}
                      href={h.url || "#"}
                      target={h.url ? "_blank" : undefined}
                      rel={h.url ? "noreferrer" : undefined}
                      className={`flex items-start gap-3 rounded-2xl border bg-card p-4 shadow-soft transition ${h.url ? "hover:border-primary hover:shadow-elevated" : "cursor-default"}`}
                    >
                      {h.image_url ? (
                        <img src={h.image_url} alt={h.name} className="h-14 w-14 shrink-0 rounded-xl border object-cover" />
                      ) : (
                        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border bg-secondary text-muted-foreground">
                          <Trophy className="h-5 w-5" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{h.name}</p>
                        {h.role && <p className="truncate text-xs text-muted-foreground">{h.role}</p>}
                        {h.reason && <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground"><RichText text={h.reason} /></p>}
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">
            Aún no hay jugadores en el cuadro de honor.
          </div>
        )}
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center gap-2">
          <Heart className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Dedicaciones</h2>
        </div>
        {dedications.isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : dedications.data && dedications.data.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {dedications.data.map((d) => (
              <a
                key={d.id}
                href={d.url || "#"}
                target={d.url ? "_blank" : undefined}
                rel={d.url ? "noreferrer" : undefined}
                className={`flex items-start gap-3 rounded-2xl border bg-card p-4 shadow-soft transition ${d.url ? "hover:border-primary hover:shadow-elevated" : "cursor-default"}`}
              >
                {d.image_url ? (
                  <img src={d.image_url} alt={d.title} className="h-16 w-16 shrink-0 rounded-xl border object-cover" />
                ) : (
                  <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl border bg-secondary text-muted-foreground">
                    <Heart className="h-5 w-5" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{d.title}</p>
                  {d.target_name && <p className="text-xs text-muted-foreground">Para {d.target_name}</p>}
                  {d.message && <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground"><RichText text={d.message} /></p>}
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">
            Aún no hay dedicaciones publicadas.
          </div>
        )}
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Versiones</h2>
        </div>
        {versions.isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : versions.data && versions.data.length ? (
          <ol className="space-y-3">
            {versions.data.map((v) => (
              <li key={v.id} className="rounded-2xl border bg-card p-4 shadow-soft">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-base font-semibold">{v.version}</span>
                  {v.released_at && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(v.released_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
                {v.notes && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground"><RichText text={v.notes} /></p>}
              </li>
            ))}
          </ol>
        ) : (
          <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">
            Aún no hay versiones publicadas.
          </div>
        )}
      </section>

      <section className="mt-10">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Créditos</h2>
        </div>
        {credits.isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : credits.data && credits.data.length ? (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {credits.data.map((c) => (
              <a
                key={c.id}
                href={c.url || "#"}
                target={c.url ? "_blank" : undefined}
                rel={c.url ? "noreferrer" : undefined}
                className={`flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-soft transition ${c.url ? "hover:border-primary hover:shadow-elevated" : "cursor-default"}`}
              >
                {c.image_url ? (
                  <img src={c.image_url} alt={c.name} className="h-14 w-14 shrink-0 rounded-xl border object-cover" />
                ) : (
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border bg-secondary text-muted-foreground">
                    <ImageIcon className="h-5 w-5" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{c.name}</p>
                  {c.role && <p className="truncate text-xs text-muted-foreground">{c.role}</p>}
                </div>
                {c.url && <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />}
              </a>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">
            Aún no hay créditos añadidos.
          </div>
        )}
      </section>

      <AdSlot placement="more" position="bottom" className="mt-10" />
    </div>
  );
}