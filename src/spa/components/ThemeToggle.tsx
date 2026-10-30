import { useEffect, useState } from "react";
import { Moon, Sun, Crown } from "lucide-react";

export type Theme = "light" | "dark" | "gold";

const KEY = "nlab-theme";

export const THEMES: { value: Theme; label: string; hint: string }[] = [
  { value: "light", label: "Claro", hint: "Modo blanco" },
  { value: "dark", label: "Oscuro", hint: "Modo negro" },
  { value: "gold", label: "Gold", hint: "Tema dorado (manual)" },
];

export function getStoredTheme(): Theme {
  if (typeof localStorage === "undefined") return "dark";
  const v = localStorage.getItem(KEY) as Theme | null;
  return v === "light" || v === "dark" || v === "gold" ? v : "dark";
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark" || theme === "gold");
  root.classList.toggle("gold", theme === "gold");
  try { localStorage.setItem(KEY, theme); } catch { /* ignore */ }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getStoredTheme);

  useEffect(() => { applyTheme(theme); }, [theme]);

  return (
    <div className="rounded-xl border bg-background p-3">
      <p className="text-sm font-medium">Tema de la web</p>
      <p className="text-xs text-muted-foreground">
        {THEMES.find((t) => t.value === theme)?.hint}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {THEMES.map((t) => {
          const Icon = t.value === "light" ? Sun : t.value === "dark" ? Moon : Crown;
          const active = theme === t.value;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => setTheme(t.value)}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                active ? "border-primary bg-primary-soft text-primary" : "hover:bg-accent"
              }`}
            >
              <Icon className="h-4 w-4" /> {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
