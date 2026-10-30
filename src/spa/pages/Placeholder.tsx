// Temporary stub used while the SPA migration is in progress.
// Each phase replaces stubs with the real ported pages.
import { Helmet } from "react-helmet-async";
import { Loader2 } from "lucide-react";

export default function Placeholder({ title }: { title: string }) {
  return (
    <>
      <Helmet><title>{title} — NLab</title></Helmet>
      <div className="grid min-h-screen place-items-center gap-3 text-center">
        <div>
          <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {title}: pendiente de migrar en las siguientes fases.
          </p>
        </div>
      </div>
    </>
  );
}