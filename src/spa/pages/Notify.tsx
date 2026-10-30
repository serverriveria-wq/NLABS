import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/spa/hooks/useAuth";
import { Megaphone, Pin, SmilePlus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const REACTION_EMOJIS = ["👍", "❤️", "😂", "🔥", "🎉", "😮", "😢", "👀"];

export function useAnnouncements() {
  return useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const [a, r] = await Promise.all([
        supabase.from("announcements" as never).select("*").order("pinned", { ascending: false }).order("created_at", { ascending: false }),
        supabase.from("announcement_reactions" as never).select("announcement_id, user_id, emoji"),
      ]);
      if (a.error) throw new Error(a.error.message);
      return { items: (a.data ?? []) as any[], reactions: (r.data ?? []) as any[] };
    },
  });
}

export function AnnouncementCard({ a, reactions, uid, onToggle }: { a: any; reactions: any[]; uid?: string; onToggle?: (emoji: string, mine: boolean) => void }) {
  const [picker, setPicker] = useState(false);
  const mine = reactions.filter((r) => r.announcement_id === a.id);
  const grouped: Record<string, { n: number; me: boolean }> = {};
  mine.forEach((r) => { const g = (grouped[r.emoji] ||= { n: 0, me: false }); g.n++; if (r.user_id === uid) g.me = true; });
  return (
    <article className="overflow-hidden rounded-xl border bg-card">
      <div className="flex">
        <div className="w-1 shrink-0" style={{ background: a.color || "hsl(var(--primary))" }} />
        <div className="min-w-0 flex-1 space-y-2 p-4">
          <div className="flex items-center gap-2">
            {a.pinned && <Pin className="h-3.5 w-3.5 text-primary" />}
            <h3 className="font-semibold">{a.title}</h3>
            <span className="ml-auto text-[11px] text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
          </div>
          {a.body && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{a.body}</p>}
          {a.image_url && <img src={a.image_url} alt="" className="max-h-80 rounded-lg object-cover" />}
          {a.url && <a href={a.url} target="_blank" rel="noreferrer" className="inline-block text-sm font-medium text-primary hover:underline">{a.url_label || a.url}</a>}
          {onToggle && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {Object.entries(grouped).map(([e, g]) => (
                <button key={e} onClick={() => onToggle(e, g.me)}
                  className={cn("rounded-full border px-2 py-0.5 text-xs", g.me ? "border-primary bg-primary-soft text-primary" : "bg-muted/50")}>
                  {e} {g.n}
                </button>
              ))}
              <div className="relative">
                <button onClick={() => setPicker((v) => !v)} className="rounded-full border p-1 text-muted-foreground hover:bg-accent"><SmilePlus className="h-3.5 w-3.5" /></button>
                {picker && (
                  <div className="absolute left-0 z-10 mt-1 flex gap-1 rounded-lg border bg-popover p-1 shadow">
                    {REACTION_EMOJIS.map((e) => (
                      <button key={e} className="rounded p-1 hover:bg-accent" onClick={() => { setPicker(false); onToggle(e, !!grouped[e]?.me); }}>{e}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

import { NotificationPrefs } from "@/spa/components/NotificationPrefs";

export default function NotifyPage() {
  const { user } = useAuth() as any;
  const uid: string | undefined = user?.id;
  const qc = useQueryClient();
  const q = useAnnouncements();

  useEffect(() => {
    const ch = supabase.channel("ann")
      .on("postgres_changes", { event: "*", schema: "public", table: "announcement_reactions" }, () => qc.invalidateQueries({ queryKey: ["announcements"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, () => qc.invalidateQueries({ queryKey: ["announcements"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  async function toggle(annId: string, emoji: string, mine: boolean) {
    if (!uid) return;
    const t = supabase.from("announcement_reactions" as never);
    const { error } = mine
      ? await t.delete().eq("announcement_id", annId).eq("user_id", uid).eq("emoji", emoji)
      : await t.insert({ announcement_id: annId, user_id: uid, emoji } as never);
    if (error) toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["announcements"] });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
      <Helmet><title>Noticias — NLabs</title></Helmet>
      <h1 className="mb-1 flex items-center gap-2 text-2xl font-bold tracking-tight"><Megaphone className="h-6 w-6 text-primary" /> Noticias</h1>
      <p className="mb-6 text-sm text-muted-foreground">Mensajes importantes del team.</p>
      <NotificationPrefs />
      {q.isLoading && <p className="text-sm text-muted-foreground">Cargando…</p>}
      <div className="space-y-3">
        {(q.data?.items ?? []).map((a) => (
          <AnnouncementCard key={a.id} a={a} reactions={q.data!.reactions} uid={uid} onToggle={(e, m) => toggle(a.id, e, m)} />
        ))}
        {!q.isLoading && (q.data?.items ?? []).length === 0 && <p className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">Aún no hay avisos.</p>}
      </div>
    </div>
  );
}
