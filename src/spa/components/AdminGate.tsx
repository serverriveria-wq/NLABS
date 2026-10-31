import { useEffect, useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { ADMIN_GATE_EVENT, ADMIN_GATE_KEY, adminGateValid, callAdmin } from "@/spa/lib/adminApi";
import { Button } from "@/components/ui/button";

const KEY = ADMIN_GATE_KEY;

export function AdminGate({ children }: { children: React.ReactNode }) {
  const [ok, setOk] = useState(() => adminGateValid());
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [cooldown, setCooldown] = useState(false);

  useEffect(() => {
    const onExpire = () => setOk(false);
    window.addEventListener(ADMIN_GATE_EVENT, onExpire);
    return () => window.removeEventListener(ADMIN_GATE_EVENT, onExpire);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (cooldown) return;
    setLoading(true);
    setError(null);
    try {
      const res = await callAdmin<{ token: string }>("verifyAdminCode", { code });
      sessionStorage.setItem(KEY, res.token);
      setOk(true);
    } catch (err) {
      const n = attempts + 1;
      setAttempts(n);
      const raw = (err as Error).message ?? "";
      setError(
        raw === "Forbidden"
          ? "Tu cuenta no tiene permisos de administrador."
          : raw || "Código incorrecto",
      );
      setCode("");
      if (n % 3 === 0) {
        setCooldown(true);
        setError("Demasiados intentos. Espera 15 segundos.");
        setTimeout(() => {
          setCooldown(false);
          setError(null);
        }, 15000);
      }
    } finally {
      setLoading(false);
    }
  }

  if (ok) return <>{children}</>;

  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-16">
      <div className="rounded-2xl border bg-card p-6 shadow-soft">
        <div className="mb-4 flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Verificación adicional</h1>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Introduce el código de acceso al panel para continuar.
        </p>
        <form onSubmit={submit} className="space-y-3">
          <input
            type="password"
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Código de acceso"
            className="input"
          />
          <Button
            type="submit"
            disabled={loading || cooldown || !code}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />} Desbloquear
          </Button>
          {error && <p className="text-center text-xs text-destructive">{error}</p>}
        </form>
      </div>
    </div>
  );
}
