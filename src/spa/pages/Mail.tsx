import { useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/spa/hooks/useAuth";
import { Mail, Send, Search } from "lucide-react";
import { toast } from "sonner";
import { MemberBadge } from "@/spa/components/MemberBadge";
import { cn } from "@/lib/utils";

type Msg = { id: string; sender_id: string; recipient_id: string; body: string; read_at: string | null; created_at: string };

export default function MailPage() {
  const { user } = useAuth() as any;
  const uid: string | undefined = user?.id;
  const qc = useQueryClient();
  const [active, setActive] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const profiles = useQuery({
    queryKey: ["mail-profiles"],
    queryFn: async () => ((await supabase.from("profiles").select("id, username, display_name, avatar_url, badge_label, badge_gradient")).data ?? []) as any[],
  });
  const msgs = useQuery({
    queryKey: ["mail-messages", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase.from("direct_messages" as never).select("*").order("created_at");
      if (error) throw new Error(error.message);
      return (data ?? []) as Msg[];
    },
  });

  useEffect(() => {
    if (!uid) return;
    const ch = supabase.channel("dm-" + uid)
      .on("postgres_changes", { event: "*", schema: "public", table: "direct_messages" }, () =>
        qc.invalidateQueries({ queryKey: ["mail-messages", uid] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [uid, qc]);

  const profById = useMemo(() => Object.fromEntries((profiles.data ?? []).map((p) => [p.id, p])), [profiles.data]);

  const convos = useMemo(() => {
    const map: Record<string, { other: string; last: Msg; unread: number }> = {};
    (msgs.data ?? []).forEach((m) => {
      const other = m.sender_id === uid ? m.recipient_id : m.sender_id;
      const c = (map[other] ||= { other, last: m, unread: 0 });
      c.last = m;
      if (m.recipient_id === uid && !m.read_at) c.unread++;
    });
    return Object.values(map).sort((a, b) => b.last.created_at.localeCompare(a.last.created_at));
  }, [msgs.data, uid]);

  const thread = (msgs.data ?? []).filter((m) => active && (m.sender_id === active || m.recipient_id === active));

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
    if (!active || !uid) return;
    const unread = thread.filter((m) => m.recipient_id === uid && !m.read_at).map((m) => m.id);
    if (unread.length) {
      supabase.from("direct_messages" as never).update({ read_at: new Date().toISOString() } as never).in("id", unread)
        .then(() => qc.invalidateQueries({ queryKey: ["mail-messages", uid] }));
    }
  }, [active, thread.length]); // eslint-disable-line react-hooks/exhaustive-deps

  async function send() {
    const body = text.trim();
    if (!body || !active || !uid) return;
    if (body.length > 4000) return toast.error("Mensaje demasiado largo (máx. 4000).");
    const { error } = await supabase.from("direct_messages" as never).insert({ sender_id: uid, recipient_id: active, body } as never);
    if (error) return toast.error(error.message);
    setText("");
    qc.invalidateQueries({ queryKey: ["mail-messages", uid] });
  }

  const s = search.trim().toLowerCase();
  const people = (profiles.data ?? []).filter((p) => p.id !== uid && s &&
    ((p.username ?? "").toLowerCase().includes(s) || (p.display_name ?? "").toLowerCase().includes(s)));
  const other = active ? profById[active] : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      <Helmet><title>Correo — NLab</title></Helmet>
      <h1 className="mb-1 flex items-center gap-2 text-2xl font-bold tracking-tight"><Mail className="h-6 w-6 text-primary" /> Correo</h1>
      <p className="mb-6 text-sm text-muted-foreground">Mensajes privados con los miembros del team.</p>
      <div className="grid h-[70vh] gap-4 md:grid-cols-[280px_1fr]">
        <aside className={cn("flex flex-col overflow-hidden rounded-2xl border bg-card", active && "hidden md:flex")}>
          <div className="relative border-b p-3">
            <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nuevo mensaje: buscar usuario…"
              className="w-full rounded-lg border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-primary" />
          </div>
          <div className="flex-1 overflow-y-auto">
            {s ? people.map((p) => (
              <Row key={p.id} p={p} sub={"@" + p.username} onClick={() => { setActive(p.id); setSearch(""); }} />
            )) : convos.map((c) => (
              <Row key={c.other} p={profById[c.other]} sub={c.last.body} unread={c.unread} active={active === c.other} onClick={() => setActive(c.other)} />
            ))}
            {!s && convos.length === 0 && <p className="p-4 text-sm text-muted-foreground">Sin conversaciones. Busca a alguien arriba para escribirle.</p>}
          </div>
        </aside>
        <section className={cn("flex flex-col overflow-hidden rounded-2xl border bg-card", !active && "hidden md:flex")}>
          {other ? (
            <>
              <div className="flex items-center gap-2 border-b p-3">
                <button className="text-sm text-muted-foreground md:hidden" onClick={() => setActive(null)}>←</button>
                <Avatar p={other} />
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 truncate text-sm font-semibold">{other.display_name ?? other.username} <MemberBadge label={other.badge_label} gradient={other.badge_gradient} /></p>
                  <p className="text-xs text-muted-foreground">@{other.username}</p>
                </div>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto p-4">
                {thread.map((m) => (
                  <div key={m.id} className={cn("flex", m.sender_id === uid ? "justify-end" : "justify-start")}>
                    <div className={cn("max-w-[75%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm",
                      m.sender_id === uid ? "bg-primary text-primary-foreground" : "bg-muted")}>
                      {m.body}
                      <p className="mt-1 text-[10px] opacity-70">{new Date(m.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>
              <div className="flex gap-2 border-t p-3">
                <textarea value={text} onChange={(e) => setText(e.target.value)} rows={1} maxLength={4000}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="Escribe un mensaje…" className="flex-1 resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
                <button onClick={send} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground"><Send className="h-4 w-4" /></button>
              </div>
            </>
          ) : (
            <div className="grid flex-1 place-items-center text-sm text-muted-foreground">Elige una conversación.</div>
          )}
        </section>
      </div>
    </div>
  );
}

function Avatar({ p }: { p: any }) {
  return p?.avatar_url ? <img src={p.avatar_url} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" /> :
    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-semibold text-primary">{(p?.display_name ?? p?.username ?? "?").slice(0, 1).toUpperCase()}</div>;
}

function Row({ p, sub, unread, active, onClick }: { p: any; sub: string; unread?: number; active?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn("flex w-full items-center gap-3 border-b px-3 py-2 text-left hover:bg-accent", active && "bg-primary-soft")}>
      <Avatar p={p} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{p?.display_name ?? p?.username ?? "Usuario"}</p>
        <p className="truncate text-xs text-muted-foreground">{sub}</p>
      </div>
      {!!unread && <span className="rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">{unread}</span>}
    </button>
  );
}
