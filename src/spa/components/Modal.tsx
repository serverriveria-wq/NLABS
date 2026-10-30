import { useEffect } from "react";
import { X } from "lucide-react";

/** Modal accesible: Esc para cerrar, clic fuera para cerrar, foco en el diálogo. */
export function Modal({ title, onClose, children, wide }: { title?: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", h); document.body.style.overflow = prev; };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/60 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={title} className={"relative w-full rounded-2xl border bg-card p-5 shadow-xl " + (wide ? "max-w-4xl" : "max-w-xl")}>
        <button onClick={onClose} aria-label="Cerrar" className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-accent"><X className="h-4 w-4" /></button>
        {title && <h2 className="mb-3 pr-8 text-lg font-semibold">{title}</h2>}
        {children}
      </div>
    </div>
  );
}
