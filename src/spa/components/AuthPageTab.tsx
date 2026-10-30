import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, Loader2 } from "lucide-react";
import { callAdmin } from "@/spa/lib/adminApi";
import { MediaInput } from "@/spa/components/MediaInput";
import {
  AuthView,
  AUTH_PAGE_DEFAULTS,
  useAuthPageConfig,
  type AuthPageConfig,
} from "@/spa/components/AuthView";

const TEXT_FIELDS: { key: keyof AuthPageConfig; label: string }[] = [
  { key: "title", label: "Título" },
  { key: "subtitle", label: "Subtítulo" },
  { key: "tab_signin_label", label: "Pestaña: iniciar sesión" },
  { key: "tab_signup_label", label: "Pestaña: crear cuenta" },
  { key: "identifier_label", label: "Etiqueta usuario/correo" },
  { key: "identifier_placeholder", label: "Placeholder usuario/correo" },
  { key: "password_label", label: "Etiqueta contraseña" },
  { key: "password_placeholder", label: "Placeholder contraseña" },
  { key: "email_label", label: "Etiqueta correo" },
  { key: "email_placeholder", label: "Placeholder correo" },
  { key: "username_label", label: "Etiqueta usuario" },
  { key: "username_placeholder", label: "Placeholder usuario" },
  { key: "signin_button", label: "Botón ingresar" },
  { key: "signup_button", label: "Botón crear cuenta" },
  { key: "notice", label: "Aviso bajo el formulario" },
  { key: "background_gradient", label: "Degradado de fondo (CSS)" },
];

export function AuthPageTab() {
  const qc = useQueryClient();
  const q = useAuthPageConfig();
  const [form, setForm] = useState<AuthPageConfig>(AUTH_PAGE_DEFAULTS);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (q.data) setForm(q.data);
  }, [q.data]);

  function set<K extends keyof AuthPageConfig>(k: K, v: AuthPageConfig[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save() {
    setSaving(true);
    try {
      await callAdmin("updateAuthPage", form as unknown as Record<string, unknown>);
      await qc.invalidateQueries({ queryKey: ["auth-page-settings"] });
      toast.success("Página de acceso actualizada");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (q.isLoading) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4 rounded-2xl border bg-card p-4">
        <h2 className="text-sm font-semibold">Editar página de inicio de sesión</h2>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Logo</label>
          <MediaInput
            value={form.logo_url}
            onChange={(url) => set("logo_url", url)}
            bucket="branding"
            folder="auth"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Imagen de fondo</label>
          <MediaInput
            value={form.background_url}
            onChange={(url) => set("background_url", url)}
            bucket="branding"
            folder="auth"
          />
        </div>

        {TEXT_FIELDS.map((f) => (
          <div key={String(f.key)}>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{f.label}</label>
            <input
              className="input"
              value={(form[f.key] as string) ?? ""}
              onChange={(e) => set(f.key, e.target.value as never)}
              placeholder={(AUTH_PAGE_DEFAULTS[f.key] as string) || ""}
            />
          </div>
        ))}

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.show_back_link}
            onChange={(e) => set("show_back_link", e.target.checked)}
          />
          Mostrar enlace "Volver"
        </label>

        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar
        </button>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold">Vista previa</p>
        <div className="overflow-hidden rounded-xl border">
          <AuthView
            cfg={form}
            mode={mode}
            onModeChange={setMode}
            values={{ identifier: "", email: "", username: "", password: "" }}
            onChange={() => {}}
            preview
          />
        </div>
      </div>
    </div>
  );
}
