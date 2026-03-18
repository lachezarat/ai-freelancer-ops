export const env = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3000",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
};

export function hasPublicSupabaseEnv() {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

export function hasAdminSupabaseEnv() {
  return hasPublicSupabaseEnv() && Boolean(env.supabaseServiceRoleKey);
}
