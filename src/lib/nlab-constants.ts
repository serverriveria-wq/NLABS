export const PROJECT_TYPES = [
  { value: "solo", label: "Solo Project" },
  { value: "mini_collab", label: "Mini Collab" },
  { value: "collab", label: "Collab" },
  { value: "megacollab", label: "MegaCollab" },
  { value: "extreme_demon", label: "Extreme Demon Project" },
  { value: "art", label: "Art Project" },
  { value: "layout", label: "Layout Project" },
  { value: "remake", label: "Remake Project" },
  { value: "contest", label: "Contest Project" },
  { value: "secret", label: "Secret Project" },
] as const;

export const PROJECT_STATUSES = [
  { value: "active", label: "Activo", tone: "success" },
  { value: "paused", label: "En pausa", tone: "warning" },
  { value: "review", label: "En revisión", tone: "info" },
  { value: "verification", label: "En verificación", tone: "info" },
  { value: "showcase", label: "En showcase", tone: "info" },
  { value: "cancelled", label: "Cancelado", tone: "danger" },
  { value: "completed", label: "Completado", tone: "success" },
  { value: "published", label: "Publicado", tone: "primary" },
] as const;

export const ADMIN_ROLES = [
  { value: "founder", label: "Founder" },
  { value: "owner", label: "Owner" },
  { value: "administrator", label: "Administrator" },
  { value: "moderator", label: "Moderator" },
  { value: "project_manager", label: "Project Manager" },
  { value: "host", label: "Host" },
  { value: "member", label: "Member" },
  { value: "guest", label: "Guest" },
] as const;

export type ProjectType = (typeof PROJECT_TYPES)[number]["value"];
export type ProjectStatus = (typeof PROJECT_STATUSES)[number]["value"];
export type AppRole = (typeof ADMIN_ROLES)[number]["value"];

export function statusMeta(value: string) {
  return PROJECT_STATUSES.find((s) => s.value === value) ?? { value, label: value, tone: "info" as const };
}
export function typeMeta(value: string) {
  return PROJECT_TYPES.find((t) => t.value === value) ?? { value, label: value };
}
