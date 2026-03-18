"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { env } from "@/lib/env";
import { getViewer } from "@/lib/data/app-data";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type WorkspaceAccessSnapshot = {
  portal_enabled: boolean;
  client_limit: number | null;
  client_count: number;
  active_project_limit: number | null;
  active_project_count: number;
};

type ExistingClientProfile = {
  user_id: string;
  platform_role: string;
  default_workspace_id: string | null;
};

type LinkedClientRecord = {
  id: string;
  workspace_id: string;
};

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function getOrigin() {
  const headerStore = await headers();
  return headerStore.get("origin") ?? env.appUrl;
}

async function getLiveWorkspaceContext() {
  const viewer = await getViewer();
  const supabase = await getSupabaseServerClient();

  if (!supabase || viewer.mode === "demo" || !viewer.workspaceId || !viewer.userId) {
    throw new Error("Supabase env and authenticated workspace owner are required for this action.");
  }

  return { viewer, supabase };
}

async function getPostAuthDestination(userId: string) {
  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    return "/";
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("platform_role")
    .eq("user_id", userId)
    .maybeSingle();

  return profile?.platform_role === "client" ? "/portal" : "/workspace";
}

const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

function buildAuthRedirect(path: string, params: Record<string, string | undefined>) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      search.set(key, value);
    }
  });

  return `${path}?${search.toString()}`;
}

async function getFunctionAuthHeaders(
  supabase: NonNullable<Awaited<ReturnType<typeof getSupabaseServerClient>>>,
) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Authenticated Supabase session is required.");
  }

  return {
    Authorization: `Bearer ${session.access_token}`,
  };
}

async function invokeProtectedFunction<T>(
  supabase: NonNullable<Awaited<ReturnType<typeof getSupabaseServerClient>>>,
  functionName: string,
  body?: Record<string, unknown>,
) {
  const authHeaders = await getFunctionAuthHeaders(supabase);
  const response = await fetch(`${env.supabaseUrl}/functions/v1/${functionName}`, {
    method: "POST",
    headers: {
      apikey: env.supabaseAnonKey,
      ...authHeaders,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? `Edge Function ${functionName} failed with ${response.status}`);
  }

  return payload as T;
}

function buildRedirect(path: string, params: Record<string, string | undefined>) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      search.set(key, value);
    }
  });

  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

export async function signInAction(formData: FormData) {
  const parsed = authSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirect("/auth/sign-in?error=invalid_credentials");
  }

  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    redirect("/auth/sign-in?error=missing_supabase_env");
  }

  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error || !data.user) {
    redirect(
      buildAuthRedirect("/auth/sign-in", {
        error: "sign_in_failed",
        detail: error?.message,
      }),
    );
  }

  redirect(await getPostAuthDestination(data.user.id));
}

export async function signUpAction(formData: FormData) {
  const parsed = authSchema.extend({
    fullName: z.string().min(2),
    workspaceName: z.string().min(2),
  }).safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    fullName: formData.get("fullName"),
    workspaceName: formData.get("workspaceName"),
  });

  if (!parsed.success) {
    redirect("/auth/sign-up?error=invalid_signup_fields");
  }

  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    redirect("/auth/sign-up?error=missing_supabase_env");
  }

  const origin = await getOrigin();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: {
        full_name: parsed.data.fullName,
        platform_role: "freelancer",
        workspace_name: parsed.data.workspaceName,
        workspace_slug: slugify(parsed.data.workspaceName),
      },
    },
  });

  if (error) {
    redirect(
      buildAuthRedirect("/auth/sign-up", {
        error: "sign_up_failed",
        detail: error.message,
      }),
    );
  }

  if (data.user) {
    redirect("/workspace");
  }

  redirect("/auth/sign-in?notice=check_your_email");
}

export async function signOutAction() {
  const supabase = await getSupabaseServerClient();
  await supabase?.auth.signOut();
  redirect("/");
}

export async function createClientAction(formData: FormData) {
  const { viewer, supabase } = await getLiveWorkspaceContext();
  const origin = await getOrigin();
  const inviteNow = formData.get("inviteNow") === "on";
  const schema = z.object({
    name: z.string().min(2),
    email: z.email(),
    companyName: z.string().optional(),
    notes: z.string().optional(),
  });
  const parsed = schema.parse({
    name: formData.get("name"),
    email: formData.get("email"),
    companyName: formData.get("companyName") || undefined,
    notes: formData.get("notes") || undefined,
  });
  const clientEmail = parsed.email.trim().toLowerCase();

  const { data: snapshotRaw } = await supabase
    .rpc("workspace_access_snapshot", { p_workspace_id: viewer.workspaceId })
    .single();
  const snapshot = snapshotRaw as WorkspaceAccessSnapshot | null;

  if (inviteNow && !snapshot?.portal_enabled) {
    throw new Error("Client portal access is not enabled on the current plan.");
  }

  if (snapshot && snapshot.client_limit !== null && snapshot.client_count >= snapshot.client_limit) {
    throw new Error("Your current plan has reached the client limit.");
  }

  const admin = inviteNow ? getSupabaseAdminClient() : null;

  if (inviteNow && !admin) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required to send client invites.");
  }

  let existingProfile: ExistingClientProfile | null = null;

  let linkedClient: LinkedClientRecord | null = null;

  if (inviteNow && admin) {
    const { data: profileRow, error: profileError } = await admin
      .from("profiles")
      .select("user_id, platform_role, default_workspace_id")
      .ilike("email", clientEmail)
      .maybeSingle();

    if (profileError) {
      throw new Error(profileError.message);
    }

    existingProfile = profileRow as ExistingClientProfile | null;

    if (existingProfile) {
      if (existingProfile.platform_role !== "client") {
        redirect(
          buildRedirect("/workspace/clients", {
            error: "client_email_in_use",
            detail: "This email already belongs to an existing non-client account.",
          }),
        );
      }

      const { data: linkedClientRow, error: linkedClientError } = await admin
        .from("clients")
        .select("id, workspace_id")
        .eq("portal_user_id", existingProfile.user_id)
        .maybeSingle();

      if (linkedClientError) {
        throw new Error(linkedClientError.message);
      }

      linkedClient = linkedClientRow as LinkedClientRecord | null;

      if (linkedClient && linkedClient.workspace_id !== viewer.workspaceId) {
        redirect(
          buildRedirect("/workspace/clients", {
            error: "client_account_linked_elsewhere",
            detail: "This client account is already linked to another workspace.",
          }),
        );
      }
    }
  }

  const { data: existingClientRow, error: existingClientError } = await supabase
    .from("clients")
    .select("id, portal_user_id, status")
    .eq("workspace_id", viewer.workspaceId)
    .ilike("email", clientEmail)
    .maybeSingle();

  if (existingClientError) {
    throw new Error(existingClientError.message);
  }

  if (existingClientRow && !inviteNow) {
    redirect(
      buildRedirect("/workspace/clients", {
        error: "client_already_exists",
        detail: "A client with this email already exists in the workspace.",
      }),
    );
  }

  let clientId = existingClientRow?.id ?? null;

  if (existingClientRow) {
    const { error: updateClientError } = await supabase
      .from("clients")
      .update({
        name: parsed.name,
        company_name: parsed.companyName ?? null,
        notes: parsed.notes ?? null,
      })
      .eq("id", existingClientRow.id);

    if (updateClientError) {
      throw new Error(updateClientError.message);
    }
  } else {
    const { data: createdClientRow, error: createClientError } = await supabase
      .from("clients")
      .insert({
        workspace_id: viewer.workspaceId,
        email: clientEmail,
        name: parsed.name,
        company_name: parsed.companyName ?? null,
        notes: parsed.notes ?? null,
        status: inviteNow ? "pending_invite" : "active",
        invited_at: null,
        created_by: viewer.userId,
      })
      .select("id")
      .single();

    if (createClientError) {
      throw new Error(createClientError.message);
    }

    clientId = createdClientRow.id;
  }

  if (inviteNow && clientId) {
    if (existingClientRow?.portal_user_id) {
      redirect(
        buildRedirect("/workspace/clients", {
          notice: "client_portal_already_enabled",
        }),
      );
    }

    if (existingProfile) {
      if (linkedClient && linkedClient.id !== clientId) {
        redirect(
          buildRedirect("/workspace/clients", {
            error: "client_account_already_linked",
            detail: "This client account is already linked to another client record.",
          }),
        );
      }

      const linkedAt = new Date().toISOString();
      const { error: linkClientError } = await supabase
        .from("clients")
        .update({
          portal_user_id: existingProfile.user_id,
          status: "active",
          invited_at: linkedAt,
        })
        .eq("id", clientId);

      if (linkClientError) {
        throw new Error(linkClientError.message);
      }

      if (!existingProfile.default_workspace_id) {
        const { error: profileUpdateError } = await admin!
          .from("profiles")
          .update({
            default_workspace_id: viewer.workspaceId,
          })
          .eq("user_id", existingProfile.user_id);

        if (profileUpdateError) {
          throw new Error(profileUpdateError.message);
        }
      }

      revalidatePath("/workspace");
      revalidatePath("/workspace/clients");
      redirect(
        buildRedirect("/workspace/clients", {
          notice: "existing_client_linked",
        }),
      );
    }

    const inviteResult = await admin!.auth.admin.inviteUserByEmail(clientEmail, {
      redirectTo: `${origin}/auth/callback`,
      data: {
        full_name: parsed.name,
        platform_role: "client",
      },
    });

    if (inviteResult.error) {
      redirect(
        buildRedirect("/workspace/clients", {
          error: "client_invite_failed",
          detail: inviteResult.error.message,
        }),
      );
    }

    await supabase
      .from("clients")
      .update({ invited_at: new Date().toISOString() })
      .eq("id", clientId);

    revalidatePath("/workspace");
    revalidatePath("/workspace/clients");
    redirect(
      buildRedirect("/workspace/clients", {
        notice: "client_invite_sent",
      }),
    );
  }

  revalidatePath("/workspace");
  revalidatePath("/workspace/clients");
}

export async function createProjectAction(formData: FormData) {
  const { viewer, supabase } = await getLiveWorkspaceContext();
  const schema = z.object({
    title: z.string().min(2),
    description: z.string().optional(),
    dueOn: z.string().optional(),
  });
  const parsed = schema.parse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    dueOn: formData.get("dueOn") || undefined,
  });

  const { data: snapshotRaw } = await supabase
    .rpc("workspace_access_snapshot", { p_workspace_id: viewer.workspaceId })
    .single();
  const snapshot = snapshotRaw as WorkspaceAccessSnapshot | null;

  if (
    snapshot &&
    snapshot.active_project_limit !== null &&
    snapshot.active_project_count >= snapshot.active_project_limit
  ) {
    throw new Error("Your current plan has reached the active project limit.");
  }

  await supabase.from("projects").insert({
    workspace_id: viewer.workspaceId,
    created_by: viewer.userId,
    title: parsed.title,
    description: parsed.description ?? null,
    status: "draft",
    due_on: parsed.dueOn || null,
  });

  revalidatePath("/workspace");
}

export async function createMilestoneAction(formData: FormData) {
  const { viewer, supabase } = await getLiveWorkspaceContext();
  const schema = z.object({
    projectId: z.string().uuid(),
    title: z.string().min(2),
    description: z.string().optional(),
    dueAt: z.string().optional(),
    position: z.coerce.number().int().min(1).default(1),
  });
  const parsed = schema.parse({
    projectId: formData.get("projectId"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    dueAt: formData.get("dueAt") || undefined,
    position: formData.get("position") ?? 1,
  });

  await supabase.from("milestones").insert({
    project_id: parsed.projectId,
    created_by: viewer.userId,
    title: parsed.title,
    description: parsed.description ?? null,
    due_at: parsed.dueAt || null,
    position: parsed.position,
  });

  revalidatePath(`/workspace/projects/${parsed.projectId}`);
  revalidatePath("/workspace");
}

export async function createDeliverableAction(formData: FormData) {
  const { viewer, supabase } = await getLiveWorkspaceContext();
  const schema = z.object({
    projectId: z.string().uuid(),
    milestoneId: z.string().uuid(),
    title: z.string().min(2),
    description: z.string().optional(),
    body: z.string().optional(),
  });
  const parsed = schema.parse({
    projectId: formData.get("projectId"),
    milestoneId: formData.get("milestoneId"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    body: formData.get("body") || undefined,
  });

  await supabase.from("deliverables").insert({
    project_id: parsed.projectId,
    milestone_id: parsed.milestoneId,
    created_by: viewer.userId,
    title: parsed.title,
    description: parsed.description ?? null,
    body: parsed.body ?? null,
  });

  revalidatePath(`/workspace/projects/${parsed.projectId}`);
}

export async function submitDeliverableAction(formData: FormData) {
  const { supabase } = await getLiveWorkspaceContext();
  const deliverableId = String(formData.get("deliverableId") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  const milestoneId = String(formData.get("milestoneId") ?? "");

  await supabase
    .from("deliverables")
    .update({
      status: "submitted",
      submitted_at: new Date().toISOString(),
    })
    .eq("id", deliverableId);

  await supabase
    .from("milestones")
    .update({
      status: "in_review",
      submitted_at: new Date().toISOString(),
    })
    .eq("id", milestoneId);

  revalidatePath(`/workspace/projects/${projectId}`);
  revalidatePath("/portal");
}

export async function createCommentAction(formData: FormData) {
  const { viewer, supabase } = await getLiveWorkspaceContext();
  const schema = z.object({
    projectId: z.string().uuid(),
    body: z.string().min(2),
    milestoneId: z.string().uuid().optional(),
    deliverableId: z.string().uuid().optional(),
    path: z.string().min(1),
  });
  const parsed = schema.parse({
    projectId: formData.get("projectId"),
    body: formData.get("body"),
    milestoneId: formData.get("milestoneId") || undefined,
    deliverableId: formData.get("deliverableId") || undefined,
    path: formData.get("path"),
  });

  await supabase.from("comments").insert({
    project_id: parsed.projectId,
    milestone_id: parsed.milestoneId ?? null,
    deliverable_id: parsed.deliverableId ?? null,
    author_user_id: viewer.userId,
    body: parsed.body,
  });

  revalidatePath(parsed.path);
}

export async function reviewDeliverableAction(formData: FormData) {
  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase env is required.");
  }

  const schema = z.object({
    deliverableId: z.string().uuid(),
    decision: z.enum(["approved", "changes_requested"]),
    comment: z.string().optional(),
    path: z.string().min(1),
  });
  const parsed = schema.parse({
    deliverableId: formData.get("deliverableId"),
    decision: formData.get("decision"),
    comment: formData.get("comment") || undefined,
    path: formData.get("path"),
  });

  const { error } = await supabase.rpc("review_deliverable", {
    p_deliverable_id: parsed.deliverableId,
    p_decision: parsed.decision,
    p_comment: parsed.comment ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(parsed.path);
  revalidatePath("/workspace");
}

export async function startCheckoutAction(formData: FormData) {
  const { viewer, supabase } = await getLiveWorkspaceContext();

  const planCode = String(formData.get("planCode") ?? "pro");

  if (!["pro", "studio"].includes(planCode)) {
    throw new Error("Unsupported plan selection.");
  }

  if (viewer.planCode === planCode) {
    redirect(
      buildRedirect("/workspace/billing", {
        notice: "already_on_plan",
      }),
    );
  }

  const canUseDirectUpgrade = viewer.planCode === "pro" && planCode === "studio";

  if (viewer.planCode !== "free" && !canUseDirectUpgrade) {
    redirect(
      buildRedirect("/workspace/billing", {
        notice: "manage_subscription_in_portal",
      }),
    );
  }

  const origin = await getOrigin();
  const data = await invokeProtectedFunction<{
    checkoutUrl?: string;
    changedExistingSubscription?: boolean;
  }>(
    supabase,
    "create-checkout-session",
    {
      planCode,
      successUrl: `${origin}/workspace/billing?checkout=success`,
      cancelUrl: `${origin}/workspace/billing?checkout=cancelled`,
    },
  );

  if (data?.changedExistingSubscription) {
    revalidatePath("/workspace");
    revalidatePath("/workspace/billing");
    redirect(
      buildRedirect("/workspace/billing", {
        notice: "subscription_updated",
      }),
    );
  }

  if (!data?.checkoutUrl) {
    throw new Error("Unable to create checkout session.");
  }

  redirect(data.checkoutUrl);
}

export async function openBillingPortalAction() {
  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase env is required.");
  }

  const data = await invokeProtectedFunction<{ portalUrl?: string }>(
    supabase,
    "create-customer-portal-session",
  );

  if (!data?.portalUrl) {
    throw new Error("Unable to open Stripe customer portal.");
  }

  redirect(data.portalUrl);
}

export async function runAiToolAction(formData: FormData) {
  const { viewer, supabase } = await getLiveWorkspaceContext();
  const toolType = String(formData.get("toolType") ?? "") as
    | "proposal_generator"
    | "brief_analyzer"
    | "checklist_builder";
  const premiumMode = formData.get("premiumMode") === "on";
  const fields = Object.fromEntries(
    Array.from(formData.entries()).filter(([key]) => !["toolType", "premiumMode"].includes(key)),
  );

  if (premiumMode && viewer.planCode !== "studio") {
    redirect(
      buildRedirect("/tools", {
        error: "premium_mode_requires_studio",
      }),
    );
  }

  try {
    await invokeProtectedFunction(
      supabase,
      "run-ai-tool",
      {
        workspaceId: viewer.workspaceId,
        toolType,
        premiumMode,
        input: fields,
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to run AI tool.";
    redirect(
      buildRedirect("/tools", {
        error: "tool_run_failed",
        detail: message,
      }),
    );
  }

  revalidatePath("/tools");
  revalidatePath("/workspace");
}
