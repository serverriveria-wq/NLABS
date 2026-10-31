import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { MessageSquare, Send, Trash2, Reply, Flag, Pencil, Loader2, Wifi, WifiOff, Smile } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/spa/hooks/useMe";
import { Button } from "@/components/ui/button";

type Msg = { id: string; user_id: string; body: string; reply_to: string | null; edited_at: string | null; created_at: string; sticker_url?: string | null };
type Sticker = { id: string; name: string; image_url: string };
const PAGE = 50;
// Tablas nuevas (aún no están en types.ts): cliente sin tipado estricto.
const db = supabase as unknown as { from: (t: string) => any; channel: (n: string) => any; removeChannel: (c: unknown) => void };

export default function RoomPage() {
  const me = useMe();
  const uid: string | undefined = me.data?.profile?.id;
  const isAdmin = !!me.data?.roles.some((r) => ["founder", "owner", "administrator", "moderator"].includes(r));
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [text, setText] = useState("");
  const [reply, setReply] = useState<Msg | null>(null);
  const [online, setOnline] = useState(false);
  const [sending, setSending] = useState(false);
  const [unseen, setUnseen] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const stick = useRef(true);

  const people = useQuery({
    queryKey: ["room-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, username, display_name, avatar_url");
      if (error) throw error;
      return Object.fromEntries((data ?? []).map((p) => [p.id, p]));
    },
  });
  const stickers = useQuery({
    queryKey: ["room-stickers"],
    queryFn: async (): Promise<Sticker[]> => {
      const { data } = await db.from("room_stickers").select("id, name, image_url").order("order_index").order("created_at");
      return (data ?? []) as Sticker[];
    },
    staleTime: 60_000,
  });
  const who = (id: string) => {
    const p = people.data?.[id];
    return p?.display_name || p?.username || "Usuario";
  };

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await db.from("room_messages").select("*").order("created_at", { ascending: false }).limit(PAGE);
      if (!active) return;
      if (error) toast.error(error.message);
      const rows = ((data ?? []) as Msg[]).reverse();
      setMsgs(rows);
      setMore((data ?? []).length === PAGE);
      setLoading(false);
    })();
    const ch = db
      .channel("room-messages-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "room_messages" }, (p: { eventType: string; new: Msg; old: { id: string } }) => {
        if (p.eventType === "INSERT") {
          setMsgs((m) => (m.some((x) => x.id === p.new.id) ? m : [...m, p.new]));
          if (!stick.current) setUnseen((n) => n + 1);
        } else if (p.eventType === "UPDATE") setMsgs((m) => m.map((x) => (x.id === p.new.id ? p.new : x)));
        else setMsgs((m) => m.filter((x) => x.id !== p.old.id));
      })
      .subscribe((s: string) => setOnline(s === "SUBSCRIBED"));
    return () => { active = false; db.removeChannel(ch); };
  }, []);

  useEffect(() => {
    const el = boxRef.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [msgs]);

  function onScroll() {
    const el = boxRef.current;
    if (!el) return;
    stick.current = el.scrollTop + el.clientHeight > el.scrollHeight - 80;
    if (stick.current) setUnseen(0);
  }

  async function loadMore() {
    const first = msgs[0];
    if (!first) return;
    const { data } = await db.from("room_messages").select("*").lt("created_at", first.created_at).order("created_at", { ascending: false }).limit(PAGE);
    const rows = ((data ?? []) as Msg[]).reverse();
    setMsgs((m) => [...rows, ...m]);
    setMore((data ?? []).length === PAGE);
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    const { error } = await db.from("room_messages").insert({ body, reply_to: reply?.id ?? null });
    setSending(false);
    if (error) return toast.error(error.message.includes("Demasiados") ? "Vas muy rápido, espera unos segundos." : error.message);
    setText(""); setReply(null); stick.current = true;
  }

  async function sendSticker(st: Sticker) {
    if (sending) return;
    setSending(true);
    const { error } = await db.from("room_messages").insert({ body: "🖼️ " + st.name.slice(0, 40), sticker_url: st.image_url, reply_to: reply?.id ?? null });
    setSending(false);
    if (error) return toast.error(error.message.includes("Demasiados") ? "Vas muy rápido, espera unos segundos." : error.message);
    setPickerOpen(false); setReply(null); stick.current = true;
  }

  async function edit(m: Msg) {
    if (m.sticker_url) return;
    const v = window.prompt("Editar mensaje", m.body);
    if (!v || !v.trim() || v.trim() === m.body) return;
    const { error } = await db.from("room_messages").update({ body: v.trim(), edited_at: new Date().toISOString() }).eq("id", m.id);
    if (error) toast.error(error.message);
  }
  async function remove(m: Msg) {
    if (!window.confirm("¿Eliminar este mensaje?")) return;
    const { error } = await db.from("room_messages").delete().eq("id", m.id);
    if (error) toast.error(error.message);
  }
  async function report(m: Msg) {
    const reason = window.prompt("Motivo del reporte (opcional)");
    if (reason === null) return;
    const { error } = await db.from("room_reports").insert({ message_id: m.id, reason: reason.slice(0, 300) });
    toast[error ? "error" : "success"](error ? (error.code === "23505" ? "Ya reportaste este mensaje." : error.message) : "Reporte enviado. Gracias.");
  }

  const byId = useMemo(() => Object.fromEntries(msgs.map((m) => [m.id, m])), [msgs]);
  const time = (d: string) => new Date(d).toLocaleString("es", { dateStyle: "short", timeStyle: "short" });

  return (
    <div className="mx-auto flex h-[calc(100vh-3.5rem)] max-w-3xl flex-col px-4 py-4 md:px-8">
      <Helmet><title>Room — NLabs</title></Helmet>
      <div className="mb-3 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight"><MessageSquare className="h-5 w-5 text-primary" /> Room</h1>
        <span className={"flex items-center gap-1 text-xs " + (online ? "text-green-600" : "text-muted-foreground")}>
          {online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}{online ? "Conectado en tiempo real" : "Conectando…"}
        </span>
      </div>

      <div ref={boxRef} onScroll={onScroll} className="relative flex-1 space-y-2 overflow-y-auto rounded-2xl border bg-card p-3">
        {loading ? (
          <div className="grid h-full place-items-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : msgs.length === 0 ? (
          <div className="grid h-full place-items-center text-center text-sm text-muted-foreground">
            <div><MessageSquare className="mx-auto mb-2 h-8 w-8 opacity-40" />Aún no hay mensajes. ¡Rompe el hielo!</div>
          </div>
        ) : (
          <>
            {more && <div className="text-center"><Button size="sm" variant="outline" onClick={loadMore}>Cargar anteriores</Button></div>}
            {msgs.map((m) => {
              const mine = m.user_id === uid;
              const parent = m.reply_to ? byId[m.reply_to] : null;
              return (
                <div key={m.id} className={"flex " + (mine ? "justify-end" : "justify-start")}>
                  <div className={"max-w-[85%] rounded-2xl px-3 py-2 text-sm " + (mine ? "bg-primary-soft" : "bg-secondary/60")}>
                    {parent && <div className="mb-1 truncate border-l-2 border-primary pl-2 text-xs text-muted-foreground">{who(parent.user_id)}: {parent.sticker_url ? "🖼️ sticker" : parent.body}</div>}
                    <div className="mb-0.5 flex items-baseline gap-2">
                      <span className="font-semibold">{who(m.user_id)}</span>
                      <span className="text-[11px] text-muted-foreground">{time(m.created_at)}{m.edited_at ? " · editado" : ""}</span>
                    </div>
                    {m.sticker_url
                      ? <img src={m.sticker_url} alt={m.body} loading="lazy" className="my-1 h-32 w-32 object-contain" />
                      : <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                    <div className="mt-1 flex gap-3 text-[11px] text-muted-foreground">
                      <button onClick={() => setReply(m)} className="flex items-center gap-1 hover:text-foreground"><Reply className="h-3 w-3" />Responder</button>
                      {mine && !m.sticker_url && <button onClick={() => edit(m)} className="flex items-center gap-1 hover:text-foreground"><Pencil className="h-3 w-3" />Editar</button>}
                      {!mine && <button onClick={() => report(m)} className="flex items-center gap-1 hover:text-foreground"><Flag className="h-3 w-3" />Reportar</button>}
                      {(mine || isAdmin) && <button onClick={() => remove(m)} className="flex items-center gap-1 hover:text-destructive"><Trash2 className="h-3 w-3" />Eliminar</button>}
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
        {unseen > 0 && (
          <button onClick={() => { const el = boxRef.current; if (el) el.scrollTop = el.scrollHeight; setUnseen(0); }}
            className="sticky bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground shadow">
            {unseen} mensaje{unseen > 1 ? "s" : ""} nuevo{unseen > 1 ? "s" : ""} ↓
          </button>
        )}
      </div>

      {reply && (
        <div className="mt-2 flex items-center justify-between rounded-lg border bg-secondary/50 px-3 py-1.5 text-xs">
          <span className="truncate">Respondiendo a <b>{who(reply.user_id)}</b>: {reply.sticker_url ? "🖼️ sticker" : reply.body}</span>
          <button onClick={() => setReply(null)} className="ml-2 text-muted-foreground hover:text-foreground">cancelar</button>
        </div>
      )}
      {pickerOpen && (
        <div className="mt-2 max-h-48 overflow-y-auto rounded-2xl border bg-card p-2">
          {stickers.isLoading ? <p className="p-3 text-center text-xs text-muted-foreground">Cargando stickers…</p>
            : (stickers.data ?? []).length === 0 ? <p className="p-3 text-center text-xs text-muted-foreground">Aún no hay stickers. El administrador puede añadirlos desde Shell → Stickers.</p>
            : (
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                {stickers.data!.map((st) => (
                  <button key={st.id} type="button" onClick={() => sendSticker(st)} title={st.name} className="rounded-xl p-1 transition hover:bg-accent">
                    <img src={st.image_url} alt={st.name} loading="lazy" className="aspect-square w-full object-contain" />
                  </button>
                ))}
              </div>
            )}
        </div>
      )}
      <form onSubmit={send} className="mt-2 flex gap-2">
        <Button type="button" variant="outline" size="icon" aria-label="Stickers" aria-expanded={pickerOpen} onClick={() => setPickerOpen((o) => !o)}><Smile className="h-4 w-4" /></Button>
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} autoComplete="off" placeholder="Escribe un mensaje…"
          className="flex-1 rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" />
        <Button type="submit" disabled={sending || !text.trim()} className="gap-2"><Send className="h-4 w-4" /><span className="hidden sm:inline">Enviar</span></Button>
      </form>
    </div>
  );
}
