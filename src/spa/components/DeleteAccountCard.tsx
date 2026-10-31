import { useState } from "react";
import { Loader2, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Modal } from "@/spa/components/Modal";

/**
 * Eliminar cuenta con triple confirmación:
 *  1) botón → "¿Estás seguro?"  → SI
 *  2) "¿Realmente estás seguro?" → SI WE
 *  3) borrado (RPC delete_my_account) y cierre de sesión.
 */
export function DeleteAccountCard() {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [busy, setBusy] = useState(false);
  const close = () => { if (!busy) setStep(0); };

  async function doDelete() {
    setBusy(true);
    const { error } = await (supabase as unknown as { rpc: (n: string) => Promise<{ error: { message: string } | null }> }).rpc("delete_my_account");
    if (error) { setBusy(false); setStep(0); return toast.error(error.message); }
    sessionStorage.removeItem("nlab_admin_gate");
    await supabase.auth.signOut();
    toast.success("Tu cuenta fue eliminada.");
    window.location.href = "/auth";
  }

  return (
    <>
      <div className="mt-6 rounded-2xl border border-destructive/40 bg-card p-6">
        <h2 className="flex items-center gap-2 font-semibold text-destructive"><Trash2 className="h-4 w-4" /> Eliminar cuenta</h2>
        <p className="mt-1 text-sm text-muted-foreground">Borra tu cuenta y tus datos de forma permanente. Esta acción no se puede deshacer.</p>
        <button onClick={() => setStep(1)} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-destructive px-4 py-2 text-sm font-semibold text-destructive hover:bg-destructive hover:text-destructive-foreground">
          <Trash2 className="h-4 w-4" /> Eliminar mi cuenta
        </button>
      </div>

      {step === 1 && (
        <Modal onClose={close} title="¿Estás seguro?">
          <p className="flex items-start gap-2 text-sm"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" /> Vas a eliminar tu cuenta. Se borrarán tu perfil, tus mensajes y <b>también los proyectos que creaste</b>.</p>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={close} className="btn">NO, cancelar</button>
            <button onClick={() => setStep(2)} className="btn bg-destructive text-destructive-foreground border-destructive">SI</button>
          </div>
        </Modal>
      )}
      {step === 2 && (
        <Modal onClose={close} title="¿De verdad, de verdad estás seguro?">
          <p className="text-sm">Última oportunidad: al confirmar, tu cuenta se elimina <b>ahora mismo</b> y no hay vuelta atrás.</p>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={close} disabled={busy} className="btn">NO, cancelar</button>
            <button onClick={doDelete} disabled={busy} className="btn bg-destructive text-destructive-foreground border-destructive">
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} SI WE
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
