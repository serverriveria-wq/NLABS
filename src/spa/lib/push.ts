import { supabase } from "@/integrations/supabase/client";
import { VAPID_PUBLIC_KEY } from "@/config";

export type PushStatus = "registered" | "not-configured" | "unsupported" | "open-in-new-tab" | "denied" | "error";
export type PushResult = { status: PushStatus; token?: string; message?: string };

export function pushPermission(): NotificationPermission | "unavailable" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unavailable";
  return Notification.permission;
}
export function isInIframe(): boolean {
  try { return window.top !== window.self; } catch { return true; }
}
function urlB64(s: string): Uint8Array {
  const b = (s + "=".repeat((4 - (s.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(b), (c) => c.charCodeAt(0));
}

/** Debe llamarse desde un gesto del usuario (clic). Usa el estado REAL del navegador. */
export async function enablePush(): Promise<PushResult> {
  if (!VAPID_PUBLIC_KEY) return { status: "not-configured" };
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) return { status: "unsupported" };
  if (isInIframe()) return { status: "open-in-new-tab" };
  const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") return { status: "denied" };
  try {
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64(VAPID_PUBLIC_KEY) as BufferSource });
    const j = sub.toJSON();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { status: "error", message: "Inicia sesión para activar las notificaciones." };
    const { error } = await (supabase as unknown as { from: (t: string) => any }).from("push_subscriptions").upsert(
      { user_id: auth.user.id, endpoint: j.endpoint, p256dh: j.keys?.p256dh, auth: j.keys?.auth, user_agent: navigator.userAgent.slice(0, 200) },
      { onConflict: "endpoint" },
    );
    if (error) throw error;
    return { status: "registered", token: j.endpoint };
  } catch (e) {
    return { status: "error", message: (e as Error).message };
  }
}
