import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TextIcon = { id: string; key: string; image_url: string };

export function useTextIcons() {
  return useQuery({
    queryKey: ["text-icons"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () =>
      ((await supabase.from("text_icons" as never).select("id,key,image_url").order("key")).data ?? []) as TextIcon[],
  });
}

/**
 * Renders text replacing `#key` tokens with the admin-defined mini images.
 */
export function RichText({ text, className }: { text?: string | null; className?: string }) {
  const icons = useTextIcons();
  if (!text) return null;
  const map = new Map((icons.data ?? []).map((i) => [i.key.replace(/^#/, "").toLowerCase(), i]));

  const parts = text.split(/(#[a-zA-Z0-9_-]+)/g);
  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.startsWith("#")) {
          const ic = map.get(part.slice(1).toLowerCase());
          if (ic) {
            return (
              <img
                key={i}
                src={ic.image_url}
                alt={part}
                title={part}
                className="mx-0.5 inline-block h-[1.15em] w-[1.15em] -translate-y-[1px] rounded-sm object-contain align-middle"
              />
            );
          }
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}
