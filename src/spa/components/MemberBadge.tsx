export type BadgeGradient = { from?: string; to?: string } | null | undefined;

export const DEFAULT_BADGE_GRADIENT = { from: "#3b82f6", to: "#0f2d6b" };

export const BADGE_PRESETS: { label: string; value: { from: string; to: string } }[] = [
  { label: "Azul marino", value: DEFAULT_BADGE_GRADIENT },
  { label: "Dorado", value: { from: "#f5d76e", to: "#a97b0b" } },
  { label: "Esmeralda", value: { from: "#34d399", to: "#065f46" } },
  { label: "Púrpura", value: { from: "#c084fc", to: "#4c1d95" } },
  { label: "Rojo", value: { from: "#fb7185", to: "#7f1d1d" } },
];

export function MemberBadge({
  label,
  gradient,
  className = "",
}: {
  label?: string | null;
  gradient?: BadgeGradient;
  className?: string;
}) {
  if (!label) return null;
  const g = gradient?.from && gradient?.to ? gradient : DEFAULT_BADGE_GRADIENT;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-sm ${className}`}
      style={{ backgroundImage: `linear-gradient(90deg, ${g.from}, ${g.to})` }}
    >
      {label}
    </span>
  );
}
