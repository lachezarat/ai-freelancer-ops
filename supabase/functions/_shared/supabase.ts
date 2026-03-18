import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.2";
import { requiredEnv } from "./env.ts";

export function getServiceSupabaseClient() {
  return createClient(
    requiredEnv("SUPABASE_URL"),
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

export function getUserSupabaseClient() {
  return createClient(
    requiredEnv("SUPABASE_URL"),
    requiredEnv("SUPABASE_ANON_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

export async function requireUser(request: Request) {
  const authorization = request.headers.get("Authorization");

  if (!authorization?.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }

  const token = authorization.replace("Bearer ", "");
  const userClient = getUserSupabaseClient();
  const {
    data: { user },
    error,
  } = await userClient.auth.getUser(token);

  if (error || !user) {
    throw new Error("Unauthorized");
  }

  return { user, userClient };
}

export async function getOwnedWorkspace(serviceClient: ReturnType<typeof getServiceSupabaseClient>, userId: string, workspaceId?: string) {
  let query = serviceClient
    .from("workspaces")
    .select("id, name, slug, owner_user_id")
    .eq("owner_user_id", userId);

  if (workspaceId) {
    query = query.eq("id", workspaceId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Workspace not found for this user");
  }

  return data;
}

export async function getProfile(serviceClient: ReturnType<typeof getServiceSupabaseClient>, userId: string) {
  const { data, error } = await serviceClient
    .from("profiles")
    .select("user_id, email, full_name, platform_role, default_workspace_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Profile not found");
  }

  return data;
}
