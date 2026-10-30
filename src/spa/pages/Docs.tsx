import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { BookText, ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Markdown } from "@/spa/components/Markdown";

function useDocs() {
  return useQuery({
    queryKey: ["site-docs"],
    queryFn: async () =>
      ((await supabase.from("site_docs" as never).select("*").order("order_index").order("title")).data ?? []) as any[],
  });
}

export default function DocsPage() {
  const { slug } = useParams();
  const docs = useDocs();
  const list = docs.data ?? [];
  const current = slug ? list.find((d) => d.slug === slug) : list[0];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <Helmet><title>{current?.title ?? "Documentos"} — NLab</title></Helmet>
      <div className="mb-6 flex items-center gap-2">
        <BookText className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">{current?.title ?? "Documentos"}</h1>
      </div>

      {list.length > 1 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {list.map((d) => (
            <Link
              key={d.id}
              to={`/docs/${d.slug}`}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                current?.slug === d.slug ? "border-primary bg-primary-soft text-primary" : "hover:bg-accent"
              }`}
            >
              {d.title}
            </Link>
          ))}
        </div>
      )}

      <div className="rounded-2xl border bg-card p-6">
        {docs.isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : current ? (
          <Markdown source={current.content_md} />
        ) : (
          <p className="text-sm text-muted-foreground">No hay documentos publicados todavía.</p>
        )}
      </div>

      <Link to="/request" className="mt-6 inline-flex items-center gap-1 text-sm text-primary underline">
        <ChevronLeft className="h-3.5 w-3.5" /> Volver a Request
      </Link>
    </div>
  );
}
