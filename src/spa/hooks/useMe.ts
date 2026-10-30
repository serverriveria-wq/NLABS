import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) return { profile: null as any, roles: [] as string[], modalities: [] as any[] };
      const [prof, roles, mods] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", uid),
        supabase
          .from("user_modalities")
          .select("modality_id, modalities(name,slug)")
          .eq("user_id", uid),
      ]);
      return {
        profile: prof.data,
        roles: (roles.data ?? []).map((r: any) => r.role as string),
        modalities: (mods.data ?? []).map((m: any) => m.modalities),
      };
    },
  });
}