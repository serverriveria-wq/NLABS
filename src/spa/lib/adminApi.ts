import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";

/**
 * Calls the `admin-actions` edge function. The user's bearer token is
 * attached automatically by supabase-js. The function verifies the caller
 * holds an admin role before performing any privileged operation.
 */
export async function callAdmin<T = unknown>(
  action: string,
  payload: Record<string, unknown> = {},
): Promise<T> {
  const { data, error } = await supabase.functions.invoke("admin-actions", {
    body: { action, payload },
    headers: action === "verifyAdminCode" ? undefined : { "x-admin-gate": sessionStorage.getItem("nlab_admin_gate") ?? "" },
  });
  if (error) {
    // supabase-js hides the HTTP body on non-2xx; read it to surface the real message
    if (error instanceof FunctionsHttpError) {
      try {
        const body = await error.context.json();
        if (body?.error) throw new Error(String(body.error));
      } catch (e) {
        if (e instanceof Error && e.message) throw e;
      }
    }
    const message = (data as { error?: string } | null)?.error ?? error.message;
    throw new Error(message);
  }
  if (data && typeof data === "object" && "error" in data && (data as { error: string }).error) {
    throw new Error((data as { error: string }).error);
  }
  return data as T;
}
