// Vercel Cron (ver vercel.json): una vez al día consulta la base de datos para que Supabase no la pause.
const URL_ = process.env.VITE_SUPABASE_URL || "https://rzdpsdlajhblhyzlzvhi.supabase.co";
const KEY_ = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_DgeuiNfwVNHmowy_AHKS-g_nzBCt_f-";
export default async function handler(_req, res) {
  try {
    const r = await fetch(`${URL_}/functions/v1/keepalive`, { method: "POST", headers: { apikey: KEY_, "Content-Type": "application/json" }, body: "{}" });
    res.status(200).json({ ok: r.ok, status: r.status, at: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
}
