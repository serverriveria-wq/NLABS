import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type DifficultyLevel = {
  id: string; slug: string; label: string; icon_url: string | null; color: string | null; order_index: number;
};

export function useDifficulties() {
  return useQuery({
    queryKey: ["difficulty-levels"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () =>
      ((await supabase.from("difficulty_levels" as never).select("*").order("order_index").order("label")).data ?? []) as DifficultyLevel[],
  });
}

/** Select bound to `projects.difficulty` (stores the slug). */
export function DifficultySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { data } = useDifficulties();
  const known = (data ?? []).some((d) => d.slug === value);
  const current = (data ?? []).find((d) => d.slug === value);
  return (
    <div className="flex items-center gap-2">
      {current?.icon_url && <img src={current.icon_url} alt="" className="h-8 w-8 shrink-0 rounded-md border object-contain" />}
    <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Sin dificultad</option>
      {(data ?? []).map((d) => (
        <option key={d.id} value={d.slug}>{d.label}</option>
      ))}
      {value && !known && <option value={value}>{value}</option>}
    </select>
    </div>
  );
}

/** Badge that resolves a stored difficulty slug to its admin-defined label + icon. */
export function DifficultyBadge({ value, className }: { value?: string | null; className?: string }) {
  const { data } = useDifficulties();
  if (!value) return null;
  const d = (data ?? []).find((x) => x.slug === value || x.label === value);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${className ?? ""}`}
      style={d?.color ? { borderColor: d.color, color: d.color } : undefined}
    >
      {d?.icon_url && <img src={d.icon_url} alt="" className="h-3.5 w-3.5 object-contain" />}
      {d?.label ?? value}
    </span>
  );
}
