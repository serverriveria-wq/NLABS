// Admin actions edge function.
// Verifies the caller's bearer token, checks they hold an admin role,
// then dispatches to a handler based on the { action, payload } body.
// This replaces all admin serverFns from src/lib/nlab.functions.ts.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { issueGateToken, matchesAdminCode, verifyGateToken } from "./gate.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-gate",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const PUBLISHABLE_KEY =
  Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
  Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const ADMIN_ROLES = ["founder", "owner", "administrator"];
const ALL_ROLES = [
  "founder",
  "owner",
  "administrator",
  "moderator",
  "project_manager",
  "host",
  "member",
  "guest",
];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function err(message: string, status = 400) {
  return json({ error: message }, status);
}

function admin() {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function resolveUser(token: string): Promise<string | null> {
  const client = createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

async function assertAdmin(userId: string) {
  const { data } = await admin()
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  const roles = (data ?? []).map((r: { role: string }) => r.role);
  if (!roles.some((r) => ADMIN_ROLES.includes(r))) {
    throw new Error("Forbidden");
  }
}

type Payload = Record<string, unknown>;

const NULLABLE = [
  "icon_url", "color", "url_prefix", "role", "reason", "url", "image_url",
  "description", "awarded_to", "awarded_at",
];

/** Generic create/update/delete for simple admin-managed catalog tables. */
async function simpleCrud(
  sb: ReturnType<typeof admin>,
  table: string,
  op: string,
  p: Payload,
  fields: string[],
) {
  if (op === "delete") {
    const { error } = await sb.from(table).delete().eq("id", String(p.id));
    if (error) throw new Error(error.message);
    return { ok: true };
  }
  const row: Record<string, unknown> = {};
  for (const k of fields) {
    if (p[k] === undefined) continue;
    row[k] = NULLABLE.includes(k) ? ((p[k] as string) || null) : p[k];
  }
  if (op === "create") {
    const { error } = await sb.from(table).insert(row);
    if (error) throw new Error(error.message);
    return { ok: true };
  }
  const { error } = await sb.from(table).update(row).eq("id", String(p.id));
  if (error) throw new Error(error.message);
  return { ok: true };
}

async function handle(action: string, p: Payload, callerId: string) {
  const sb = admin();

  switch (action) {
    case "createUser": {
      const email = String(p.email ?? "").trim();
      const password = String(p.password ?? "");
      const username = String(p.username ?? "").trim();
      const displayName = String(p.displayName ?? username);
      const role = String(p.role ?? "member");
      if (!email || !password || !username) throw new Error("Datos incompletos");
      if (!ALL_ROLES.includes(role)) throw new Error("Rol inválido");

      const { data: created, error } = await sb.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { username, display_name: displayName },
      });
      if (error || !created?.user) {
        const msg = (error?.message ?? "").toLowerCase();
        if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
          throw new Error(`Ya existe una cuenta con el email ${email}.`);
        }
        throw new Error(error?.message ?? "No se pudo crear el usuario");
      }
      const { error: pErr } = await sb.from("profiles").upsert(
        { id: created.user.id, username, display_name: displayName, approved: true },
        { onConflict: "id" },
      );
      if (pErr) throw new Error(pErr.message);
      await sb
        .from("user_roles")
        .upsert({ user_id: created.user.id, role }, { onConflict: "user_id,role" });
      return { ok: true, userId: created.user.id };
    }

    case "resetPassword": {
      const { error } = await sb.auth.admin.updateUserById(String(p.userId), {
        password: String(p.password),
      });
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    case "deleteUser": {
      if (p.userId === callerId) throw new Error("No puedes eliminarte a ti mismo");
      const { error } = await sb.auth.admin.deleteUser(String(p.userId));
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    case "updateUser": {
      const patch: Record<string, unknown> = {};
      if (p.username !== undefined) patch.username = p.username;
      if (p.displayName !== undefined) patch.display_name = p.displayName;
      if (p.bio !== undefined) patch.bio = p.bio;
      if (p.avatarUrl !== undefined) patch.avatar_url = p.avatarUrl || null;
      if (p.bannerUrl !== undefined) patch.banner_url = p.bannerUrl || null;
      if (p.status !== undefined) patch.status = p.status;
      if (Object.keys(patch).length) {
        const { error } = await sb
          .from("profiles")
          .update(patch)
          .eq("id", String(p.userId));
        if (error) throw new Error(error.message);
      }
      if (p.email) {
        const { error } = await sb.auth.admin.updateUserById(String(p.userId), {
          email: String(p.email),
          email_confirm: true,
        });
        if (error) throw new Error(error.message);
      }
      return { ok: true };
    }

    case "setUserRoles": {
      const userId = String(p.userId);
      const roles = Array.isArray(p.roles) ? (p.roles as string[]) : [];
      if (!roles.length) throw new Error("Debe tener al menos un rol");
      for (const r of roles) if (!ALL_ROLES.includes(r)) throw new Error(`Rol inválido: ${r}`);
      await sb.from("user_roles").delete().eq("user_id", userId);
      const { error } = await sb
        .from("user_roles")
        .insert(roles.map((role) => ({ user_id: userId, role })));
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    case "setApproved": {
      const { error } = await sb
        .from("profiles")
        .update({ approved: Boolean(p.approved) })
        .eq("id", String(p.userId));
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    case "updateProject": {
      const { projectId, banner_url, ...rest } = p as Record<string, unknown>;
      const patch: Record<string, unknown> = { ...rest };
      if (banner_url !== undefined) patch.banner_url = banner_url || null;
      const { error } = await sb
        .from("projects")
        .update(patch)
        .eq("id", String(projectId));
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    case "deleteProject": {
      const { error } = await sb
        .from("projects")
        .delete()
        .eq("id", String(p.projectId));
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    case "createModality": {
      const { error } = await sb.from("modalities").insert({
        name: String(p.name),
        slug: String(p.slug),
        description: (p.description as string) ?? null,
      });
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    case "updateModality": {
      const { id, ...patch } = p as Record<string, unknown>;
      const { error } = await sb.from("modalities").update(patch).eq("id", String(id));
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    case "deleteModality": {
      const { error } = await sb.from("modalities").delete().eq("id", String(p.id));
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    case "setModalityIcon": {
      const { error } = await sb
        .from("modalities")
        .update({ icon_url: (p.icon_url as string) || null })
        .eq("id", String(p.id));
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    case "updateSiteSettings": {
      const patch: Record<string, unknown> = { id: true };
      for (const k of ["logo_url", "favicon_url", "preview_button_image_url", "site_name", "adsense_client_id", "adsense_slot_id", "dashboard_video_url", "gd_preview_bg_url", "github_icon_url"]) {
        if (p[k] !== undefined) patch[k] = (p[k] as string) || null;
      }
      if (p.adsense_enabled !== undefined) patch.adsense_enabled = Boolean(p.adsense_enabled);
      const { error } = await sb
        .from("site_settings")
        .upsert(patch, { onConflict: "id" });
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    case "upsertTextOverride": {
      const { error } = await sb.from("text_overrides").upsert({
        key: String(p.key),
        value: String(p.value ?? ""),
        gradient: p.gradient ?? null,
      });
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    case "deleteTextOverride": {
      const { error } = await sb
        .from("text_overrides")
        .delete()
        .eq("key", String(p.key));
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    case "createLinkType": {
      const { error } = await sb.from("link_types").insert({
        slug: String(p.slug),
        label: String(p.label),
        icon_url: (p.icon_url as string) || null,
        order_index: (p.order_index as number) ?? 100,
      });
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    case "updateLinkType": {
      const { id, ...rest } = p as Record<string, unknown>;
      const patch: Record<string, unknown> = { ...rest };
      if (rest.icon_url !== undefined) patch.icon_url = rest.icon_url || null;
      const { error } = await sb.from("link_types").update(patch).eq("id", String(id));
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    case "deleteLinkType": {
      const { error } = await sb.from("link_types").delete().eq("id", String(p.id));
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    case "createDependencyType": {
      const { error } = await sb.from("dependency_types").insert({
        slug: String(p.slug),
        label: String(p.label),
        icon_url: (p.icon_url as string) || null,
        order_index: (p.order_index as number) ?? 100,
      });
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    case "updateDependencyType": {
      const { id, ...rest } = p as Record<string, unknown>;
      const patch: Record<string, unknown> = { ...rest };
      if (rest.icon_url !== undefined) patch.icon_url = rest.icon_url || null;
      const { error } = await sb
        .from("dependency_types")
        .update(patch)
        .eq("id", String(id));
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    case "deleteDependencyType": {
      const { error } = await sb
        .from("dependency_types")
        .delete()
        .eq("id", String(p.id));
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    /* -------- SITE VERSIONS -------- */
    case "createVersion": {
      const { error } = await sb.from("site_versions").insert({
        version: String(p.version),
        released_at: (p.released_at as string) || null,
        notes: (p.notes as string) || null,
        order_index: (p.order_index as number) ?? 100,
      });
      if (error) throw new Error(error.message);
      return { ok: true };
    }
    case "updateVersion": {
      const { id, ...rest } = p as Record<string, unknown>;
      const patch: Record<string, unknown> = { ...rest };
      if (rest.released_at !== undefined) patch.released_at = rest.released_at || null;
      if (rest.notes !== undefined) patch.notes = rest.notes || null;
      const { error } = await sb.from("site_versions").update(patch).eq("id", String(id));
      if (error) throw new Error(error.message);
      return { ok: true };
    }
    case "deleteVersion": {
      const { error } = await sb.from("site_versions").delete().eq("id", String(p.id));
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    /* -------- SITE CREDITS -------- */
    case "createCredit": {
      const { error } = await sb.from("site_credits").insert({
        name: String(p.name),
        role: (p.role as string) || null,
        image_url: (p.image_url as string) || null,
        url: (p.url as string) || null,
        order_index: (p.order_index as number) ?? 100,
      });
      if (error) throw new Error(error.message);
      return { ok: true };
    }
    case "updateCredit": {
      const { id, ...rest } = p as Record<string, unknown>;
      const patch: Record<string, unknown> = { ...rest };
      for (const k of ["role", "image_url", "url"]) {
        if (rest[k] !== undefined) patch[k] = rest[k] || null;
      }
      const { error } = await sb.from("site_credits").update(patch).eq("id", String(id));
      if (error) throw new Error(error.message);
      return { ok: true };
    }
    case "deleteCredit": {
      const { error } = await sb.from("site_credits").delete().eq("id", String(p.id));
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    /* -------- SITE DEDICATIONS -------- */
    case "createHonor":
    case "updateHonor":
    case "deleteHonor":
      return await simpleCrud(sb, "site_honors", action.replace(/Honor$/, ""), p, [
        "name", "role", "reason", "image_url", "url", "kind", "order_index",
      ]);

    case "createDedication": {
      const { error } = await sb.from("site_dedications").insert({
        title: String(p.title),
        target_name: (p.target_name as string) || null,
        message: (p.message as string) || null,
        image_url: (p.image_url as string) || null,
        url: (p.url as string) || null,
        order_index: (p.order_index as number) ?? 100,
      });
      if (error) throw new Error(error.message);
      return { ok: true };
    }
    case "updateDedication": {
      const { id, ...rest } = p as Record<string, unknown>;
      const patch: Record<string, unknown> = { ...rest };
      for (const k of ["target_name", "message", "image_url", "url"]) {
        if (rest[k] !== undefined) patch[k] = rest[k] || null;
      }
      const { error } = await sb.from("site_dedications").update(patch).eq("id", String(id));
      if (error) throw new Error(error.message);
      return { ok: true };
    }
    case "deleteDedication": {
      const { error } = await sb.from("site_dedications").delete().eq("id", String(p.id));
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    /* -------- DIFFICULTY LEVELS / SOCIAL TYPES / TEXT ICONS -------- */
    case "createDifficulty":
    case "updateDifficulty":
    case "deleteDifficulty":
      return await simpleCrud(sb, "difficulty_levels", action.replace(/Difficulty$/, ""), p, [
        "slug", "label", "icon_url", "color", "order_index",
      ]);

    case "createSocialType":
    case "updateSocialType":
    case "deleteSocialType":
      return await simpleCrud(sb, "social_types", action.replace(/SocialType$/, ""), p, [
        "slug", "label", "icon_url", "url_prefix", "order_index",
      ]);

    case "createSiteLink":
    case "updateSiteLink":
    case "deleteSiteLink":
      return await simpleCrud(sb, "site_links", action.replace(/SiteLink$/, ""), p, [
        "title", "description", "url", "logo_url", "banner_url", "order_index",
      ]);

    case "createSticker":
    case "updateSticker":
    case "deleteSticker":
      return await simpleCrud(sb, "room_stickers", action.replace(/Sticker$/, ""), p, ["name", "image_url", "order_index"]);

    case "createTextIcon":
    case "updateTextIcon":
    case "deleteTextIcon":
      return await simpleCrud(sb, "text_icons", action.replace(/TextIcon$/, ""), p, ["key", "image_url"]);

    case "createTrophy":
    case "updateTrophy":
    case "deleteTrophy":
      return await simpleCrud(sb, "site_trophies", action.replace(/Trophy$/, ""), p, [
        "title", "description", "image_url", "url", "awarded_to", "awarded_at", "order_index",
      ]);

    case "createAdUnit":
    case "updateAdUnit":
    case "deleteAdUnit":
      return await simpleCrud(sb, "ad_units", action.replace(/AdUnit$/, ""), p, [
        "name", "network", "code", "placement", "position", "enabled", "order_index",
      ]);

    case "createDoc":
    case "updateDoc":
    case "deleteDoc":
      return await simpleCrud(sb, "site_docs", action.replace(/Doc$/, ""), p, [
        "slug", "title", "content_md", "order_index",
      ]);

    case "reviewTeamRequest": {
      const status = String(p.status ?? "");
      if (!["approved", "rejected"].includes(status)) throw new Error("Estado inválido");
      const { data: reqRow, error: rErr } = await sb
        .from("team_requests")
        .update({ status, reviewed_by: callerId })
        .eq("id", String(p.id))
        .select("user_id, modality_id")
        .maybeSingle();
      if (rErr) throw new Error(rErr.message);

      if (status === "approved" && reqRow?.user_id) {
        const patch: Record<string, unknown> = {
          badge_label: String(p.badge_label ?? "Miembro"),
          badge_gradient: p.badge_gradient ?? { from: "#3b82f6", to: "#0f2d6b" },
        };
        const { error: pErr } = await sb.from("profiles").update(patch).eq("id", reqRow.user_id);
        if (pErr) throw new Error(pErr.message);
        if (reqRow.modality_id) {
          await sb.from("user_modalities")
            .upsert({ user_id: reqRow.user_id, modality_id: reqRow.modality_id });
        }
      }
      return { ok: true };
    }

    case "setUserBadge": {
      const { error } = await sb
        .from("profiles")
        .update({
          badge_label: (p.badge_label as string) || null,
          badge_gradient: p.badge_gradient ?? null,
        })
        .eq("id", String(p.userId));
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    case "verifyAdminCode": {
      const expected = Deno.env.get("ADMIN_PANEL_CODE");
      const signingKey = Deno.env.get("ADMIN_GATE_SIGNING_KEY");
      if (!expected || !signingKey) throw new Error("Verificación de Labs no configurada");
      if (!matchesAdminCode(p.code, expected)) {
        throw new Error("Código incorrecto");
      }
      return { ok: true, token: await issueGateToken(callerId, signingKey) };
    }

    case "updateAuthPage": {
      const fields = [
        "logo_url", "title", "subtitle", "background_url", "background_gradient",
        "tab_signin_label", "tab_signup_label", "identifier_label", "identifier_placeholder",
        "password_label", "password_placeholder", "email_label", "email_placeholder",
        "username_label", "username_placeholder", "signin_button", "signup_button",
        "notice", "show_back_link",
      ];
      const nullable = ["logo_url", "background_url", "background_gradient", "notice"];
      const row: Record<string, unknown> = {};
      for (const k of fields) {
        if (p[k] === undefined) continue;
        row[k] = nullable.includes(k) ? ((p[k] as string) || null) : p[k];
      }
      const { error } = await sb.from("auth_page_settings").update(row).eq("id", true);
      if (error) throw new Error(error.message);
      return { ok: true };
    }


    default:
      throw new Error(`Acción desconocida: ${action}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return err("Method not allowed", 405);

  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return err("Unauthorized", 401);

  const userId = await resolveUser(token);
  if (!userId) return err("Unauthorized", 401);

  try {
    await assertAdmin(userId);
  } catch {
    return err("Forbidden", 403);
  }

  let body: { action?: string; payload?: Payload };
  try {
    body = await req.json();
  } catch {
    return err("Invalid JSON", 400);
  }
  const action = body.action ?? "";
  const payload = body.payload ?? {};
  if (!action) return err("Missing action", 400);

  if (action !== "verifyAdminCode") {
    const signingKey = Deno.env.get("ADMIN_GATE_SIGNING_KEY");
    const gate = req.headers.get("x-admin-gate") ?? "";
    if (!signingKey || !(await verifyGateToken(gate, userId, signingKey))) {
      return err("Introduce de nuevo el código de Shell", 403);
    }
  }

  try {
    const result = await handle(action, payload, userId);
    return json(result);
  } catch (e) {
    return err((e as Error).message ?? "Error", 400);
  }
});