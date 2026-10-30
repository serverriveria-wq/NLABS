import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, KeyRound } from "lucide-react";

export default function PasswordRecovery() {
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) { setReady(true); setChecking(false); }
    });
    supabase.auth.getSession().then(({ data }) => { setReady(!!data.session); setChecking(false); });
    return () => data.subscription.unsubscribe();
  }, []);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (password !== confirm) { setError("Las contraseñas no coinciden."); return; }
    setSaving(true); setError("");
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) { setError("No se pudo guardar la contraseña. Solicita otro enlace e inténtalo de nuevo."); return; }
    await supabase.auth.signOut(); setDone(true);
  }
  return <main className="grid min-h-screen place-items-center bg-background px-4">
    <Helmet><title>Nueva contraseña — NLab</title></Helmet>
    <section className="w-full max-w-md space-y-5">
      <KeyRound className="h-8 w-8 text-primary" />
      <h1 className="text-2xl font-bold">Nueva contraseña</h1>
      {checking ? <Loader2 className="animate-spin text-muted-foreground" /> : done ? <p>Tu contraseña se ha guardado.</p> : !ready ? <p>Este enlace no es válido o ha caducado. Solicita otro desde el inicio de sesión.</p> : <form onSubmit={submit} className="space-y-4">
        <label className="block space-y-2"><span>Contraseña</span><input type="password" autoComplete="new-password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2" /></label>
        <label className="block space-y-2"><span>Repetir contraseña</span><input type="password" autoComplete="new-password" required minLength={6} value={confirm} onChange={e => setConfirm(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2" /></label>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={saving} className="w-full">{saving && <Loader2 className="animate-spin" />}Guardar contraseña</Button>
      </form>}
      <Button asChild variant="link"><Link to="/auth">Volver al inicio de sesión</Link></Button>
    </section>
  </main>;
}