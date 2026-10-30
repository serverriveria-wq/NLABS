import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link2 } from "lucide-react";

export type SocialType = {
  id: string; slug: string; label: string; icon_url: string | null; url_prefix: string | null; order_index: number;
};

export function useSocialTypes() {
  return useQuery({
    queryKey: ["social-types"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () =>
      ((await supabase.from("social_types" as never).select("*").order("order_index").order("label")).data ?? []) as SocialType[],
  });
}

export function socialHref(t: SocialType, value: string) {
  if (/^https?:\/\//i.test(value)) return value;
  if (t.url_prefix) return `${t.url_prefix}${value.replace(/^@/, "")}`;
  return undefined;
}

/** Compact icon row for member cards. */
export function SocialIcons({
  socials,
  types,
}: {
  socials: { social_type_id: string; value: string }[];
  types: SocialType[];
}) {
  const byId = new Map(types.map((t) => [t.id, t]));
  const items = socials.map((s) => ({ s, t: byId.get(s.social_type_id) })).filter((x) => x.t) as {
    s: { social_type_id: string; value: string }; t: SocialType;
  }[];
  if (!items.length) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t pt-3">
      {items.map(({ s, t }) => {
        const href = socialHref(t, s.value);
        const inner = t.icon_url ? (
          <img src={t.icon_url} alt={t.label} className="h-4 w-4 object-contain" />
        ) : (
          <Link2 className="h-3.5 w-3.5" />
        );
        const cls = "inline-flex items-center gap-1 rounded-full border bg-secondary/60 px-2 py-1 text-[10px] transition hover:border-primary hover:text-primary";
        return href ? (
          <a key={t.id} href={href} target="_blank" rel="noreferrer" className={cls} title={`${t.label}: ${s.value}`}>
            {inner}<span className="max-w-[7rem] truncate">{s.value.replace(/^https?:\/\//, "")}</span>
          </a>
        ) : (
          <span key={t.id} className={cls} title={t.label}>{inner}<span className="max-w-[7rem] truncate">{s.value}</span></span>
        );
      })}
    </div>
  );
}
