// Public username sign-in. Never discloses an account's email address.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: cors });
  }
  try {
    const { identifier, password } = await req.json();
    const ident = String(identifier ?? "").trim().toLowerCase();
    if (!/^[a-z0-9_.-]{2,40}$/.test(ident) || typeof password !== "string" || !password || password.length > 1024) return json({ error: "Credenciales incorrectas" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const { data: prof } = await admin
      .from("profiles")
      .select("id")
      .eq("username", ident)
      .maybeSingle();
    if (!prof) return json({ error: "Credenciales incorrectas" }, 400);
    const { data: userRes } = await admin.auth.admin.getUserById(prof.id);
    const email = userRes.user?.email;
    if (!email) return json({ error: "Credenciales incorrectas" }, 400);
    const client = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error || !data.session) return json({ error: "Credenciales incorrectas" }, 400);
    return json({ session: data.session });
  } catch (e) {
    return json({ error: "No se pudo iniciar sesión" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}