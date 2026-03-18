import { createClient } from "@supabase/supabase-js";
import { env, hasAdminSupabaseEnv } from "@/lib/env";

export function getSupabaseAdminClient() {
  if (!hasAdminSupabaseEnv()) {
    return null;
  }

  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
