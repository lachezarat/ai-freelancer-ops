import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";
import {
  buildSubscription,
  demoSnapshot,
  demoWorkspace,
  getDemoAdminData,
  getDemoPortalData,
  getDemoWorkspaceData,
} from "@/lib/demo-data";
import type {
  AccessSnapshot,
  AdminData,
  PortalData,
  ProjectRecord,
  SubscriptionSummary,
  Viewer,
  ViewerRole,
  WorkspaceData,
  WorkspaceSummary,
} from "@/lib/types";
import { hasPublicSupabaseEnv } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function mapViewerRole(role?: string | null): ViewerRole {
  if (role === "admin" || role === "freelancer" || role === "client") {
    return role;
  }

  return "guest";
}

function mapWorkspace(value: Record<string, unknown> | null | undefined): WorkspaceSummary | null {
  if (!value) {
    return null;
  }

  return {
    id: String(value.id),
    name: String(value.name),
    slug: String(value.slug),
    status: String(value.status ?? "active"),
  };
}

function mapSubscription(value: Record<string, unknown> | null | undefined): SubscriptionSummary {
  if (!value) {
    return buildSubscription("free");
  }

  return {
    planCode: (String(value.plan_code ?? "free") as SubscriptionSummary["planCode"]),
    status: String(value.status ?? "inactive"),
    cancelAtPeriodEnd: Boolean(value.cancel_at_period_end),
    currentPeriodEnd: value.current_period_end ? String(value.current_period_end) : null,
  };
}

function mapSnapshot(value: Record<string, unknown> | null | undefined): AccessSnapshot {
  if (!value) {
    return {
      ...demoSnapshot,
      planCode: "free",
      clientCount: 0,
      activeProjectCount: 0,
      monthlyAiRunCount: 0,
      portalEnabled: false,
      aiEnabled: false,
      realtimeEnabled: false,
      premiumAiMode: false,
      clientLimit: 1,
      activeProjectLimit: 1,
      monthlyAiRunLimit: 0,
    };
  }

  return {
    planCode: String(value.plan_code ?? "free") as AccessSnapshot["planCode"],
    clientLimit: value.client_limit === null ? null : Number(value.client_limit),
    clientCount: Number(value.client_count ?? 0),
    activeProjectLimit: value.active_project_limit === null ? null : Number(value.active_project_limit),
    activeProjectCount: Number(value.active_project_count ?? 0),
    monthlyAiRunLimit: value.monthly_ai_run_limit === null ? null : Number(value.monthly_ai_run_limit),
    monthlyAiRunCount: Number(value.monthly_ai_run_count ?? 0),
    portalEnabled: Boolean(value.portal_enabled),
    aiEnabled: Boolean(value.ai_enabled),
    realtimeEnabled: Boolean(value.realtime_enabled),
    premiumAiMode: Boolean(value.premium_ai_mode),
  };
}

function mapRowKeys<T extends Record<string, unknown>>(rows: T[] | null | undefined): unknown[] {
  return (rows ?? []).map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => [
        key.replace(/_([a-z])/g, (_, match: string) => match.toUpperCase()),
        value,
      ]),
    ),
  );
}

const loadViewer = cache(async (): Promise<Viewer> => {
  if (!hasPublicSupabaseEnv()) {
    return getDemoWorkspaceData().viewer;
  }

  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    return getDemoWorkspaceData().viewer;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      mode: "live",
      isAuthenticated: false,
      userId: null,
      email: null,
      fullName: "Guest",
      role: "guest",
      workspaceId: null,
      workspaceName: null,
      workspaceSlug: null,
      planCode: "free",
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id, email, full_name, platform_role, default_workspace_id")
    .eq("user_id", user.id)
    .maybeSingle();

  let workspace: WorkspaceSummary | null = null;

  if (profile?.platform_role === "freelancer" || profile?.platform_role === "admin") {
    const { data } = await supabase
      .from("workspaces")
      .select("id, name, slug, status")
      .eq("owner_user_id", user.id)
      .maybeSingle();

    workspace = mapWorkspace(data as Record<string, unknown> | null);
  } else if (profile?.platform_role === "client") {
    const { data: clientRow } = await supabase
      .from("clients")
      .select("workspace_id")
      .eq("portal_user_id", user.id)
      .maybeSingle();

    if (clientRow?.workspace_id) {
      const { data } = await supabase
        .from("workspaces")
        .select("id, name, slug, status")
        .eq("id", clientRow.workspace_id)
        .maybeSingle();

      workspace = mapWorkspace(data as Record<string, unknown> | null);
    }
  }

  const { data: subscriptionRow } = workspace
    ? await supabase
        .from("subscriptions")
        .select("plan_code")
        .eq("workspace_id", workspace.id)
        .maybeSingle()
    : { data: null };

  return {
    mode: "live",
    isAuthenticated: true,
    userId: user.id,
    email: profile?.email ?? user.email ?? null,
    fullName: profile?.full_name ?? user.email?.split("@")[0] ?? "Authenticated user",
    role: mapViewerRole(profile?.platform_role),
    workspaceId: workspace?.id ?? null,
    workspaceName: workspace?.name ?? null,
    workspaceSlug: workspace?.slug ?? null,
    planCode: String(subscriptionRow?.plan_code ?? "free") as Viewer["planCode"],
  };
});

export async function getViewer() {
  return loadViewer();
}

export const getWorkspaceData = cache(async (): Promise<WorkspaceData> => {
  if (!hasPublicSupabaseEnv()) {
    return getDemoWorkspaceData();
  }

  const viewer = await loadViewer();

  if (!viewer.workspaceId) {
    return {
      ...getDemoWorkspaceData(),
      viewer,
      workspace: null,
      subscription: buildSubscription("free"),
      accessSnapshot: mapSnapshot(null),
      clients: [],
      projects: [],
      milestones: [],
      deliverables: [],
      comments: [],
      events: [],
      toolSessions: [],
      toolRuns: [],
    };
  }

  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    return getDemoWorkspaceData();
  }

  const [
    workspaceResult,
    subscriptionResult,
    snapshotResult,
    clientsResult,
    projectsResult,
    eventsResult,
    toolSessionsResult,
    toolRunsResult,
  ] = await Promise.all([
    supabase.from("workspaces").select("id, name, slug, status").eq("id", viewer.workspaceId).maybeSingle(),
    supabase
      .from("subscriptions")
      .select("plan_code, status, cancel_at_period_end, current_period_end")
      .eq("workspace_id", viewer.workspaceId)
      .maybeSingle(),
    supabase.rpc("workspace_access_snapshot", { p_workspace_id: viewer.workspaceId }).single(),
    supabase
      .from("clients")
      .select("id, workspace_id, portal_user_id, email, name, company_name, notes, status, invited_at, created_at")
      .eq("workspace_id", viewer.workspaceId)
      .order("created_at", { ascending: true }),
    supabase
      .from("projects")
      .select("id, workspace_id, title, description, status, starts_on, due_on, created_at, updated_at")
      .eq("workspace_id", viewer.workspaceId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("activity_events")
      .select("id, workspace_id, project_id, actor_user_id, event_type, entity_type, entity_id, visibility, payload, created_at")
      .eq("workspace_id", viewer.workspaceId)
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("tool_sessions")
      .select("id, workspace_id, owner_user_id, tool_type, title, latest_status, input_preview, last_run_at, created_at")
      .eq("workspace_id", viewer.workspaceId)
      .order("last_run_at", { ascending: false })
      .limit(8),
    supabase
      .from("tool_runs")
      .select("id, session_id, workspace_id, owner_user_id, tool_type, status, premium_mode, input, output, provider, model, usage_input_tokens, usage_output_tokens, error_message, created_at, completed_at")
      .eq("workspace_id", viewer.workspaceId)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const projectIds = (projectsResult.data ?? []).map((project) => project.id);

  const [milestonesResult, deliverablesResult, commentsResult] = projectIds.length
    ? await Promise.all([
        supabase
          .from("milestones")
          .select("id, project_id, title, description, position, due_at, status, submitted_at, approved_at, created_at, updated_at")
          .in("project_id", projectIds)
          .order("position", { ascending: true }),
        supabase
          .from("deliverables")
          .select("id, project_id, milestone_id, title, description, body, status, submitted_at, approved_at, created_at, updated_at")
          .in("project_id", projectIds)
          .order("updated_at", { ascending: false }),
        supabase
          .from("comments")
          .select("id, project_id, milestone_id, deliverable_id, author_user_id, body, created_at")
          .in("project_id", projectIds)
          .order("created_at", { ascending: false })
          .limit(24),
      ])
    : [
        { data: [] as Record<string, unknown>[] },
        { data: [] as Record<string, unknown>[] },
        { data: [] as Record<string, unknown>[] },
      ];

  return {
    viewer,
    workspace: mapWorkspace(workspaceResult.data as Record<string, unknown> | null) ?? demoWorkspace,
    subscription: mapSubscription(subscriptionResult.data as Record<string, unknown> | null),
    accessSnapshot: mapSnapshot(snapshotResult.data as Record<string, unknown> | null),
    clients: mapRowKeys(clientsResult.data) as WorkspaceData["clients"],
    projects: mapRowKeys(projectsResult.data) as WorkspaceData["projects"],
    milestones: mapRowKeys(milestonesResult.data) as WorkspaceData["milestones"],
    deliverables: mapRowKeys(deliverablesResult.data) as WorkspaceData["deliverables"],
    comments: mapRowKeys(commentsResult.data) as WorkspaceData["comments"],
    events: mapRowKeys(eventsResult.data) as WorkspaceData["events"],
    toolSessions: mapRowKeys(toolSessionsResult.data) as WorkspaceData["toolSessions"],
    toolRuns: mapRowKeys(toolRunsResult.data) as WorkspaceData["toolRuns"],
  };
});

export async function requireWorkspaceViewer() {
  const data = await getWorkspaceData();

  if (data.viewer.mode === "live" && !data.viewer.isAuthenticated) {
    redirect("/auth/sign-in");
  }

  if (data.viewer.mode === "live" && !["freelancer", "admin"].includes(data.viewer.role)) {
    redirect("/portal");
  }

  return data;
}

export const getPortalData = cache(async (): Promise<PortalData> => {
  if (!hasPublicSupabaseEnv()) {
    return getDemoPortalData();
  }

  const viewer = await loadViewer();

  if (!viewer.workspaceId) {
    return {
      ...getDemoPortalData(),
      viewer,
      workspace: null,
      projects: [],
      milestones: [],
      deliverables: [],
      comments: [],
      events: [],
      subscription: buildSubscription("free"),
    };
  }

  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    return getDemoPortalData();
  }

  const { data: accessibleProjects } = await supabase
    .from("projects")
    .select("id, workspace_id, title, description, status, starts_on, due_on, created_at, updated_at")
    .order("updated_at", { ascending: false });

  const projectIds = (accessibleProjects ?? []).map((project) => project.id);

  const [workspaceResult, subscriptionResult, milestonesResult, deliverablesResult, commentsResult, eventsResult] =
    await Promise.all([
      supabase.from("workspaces").select("id, name, slug, status").eq("id", viewer.workspaceId).maybeSingle(),
      supabase
        .from("subscriptions")
        .select("plan_code, status, cancel_at_period_end, current_period_end")
        .eq("workspace_id", viewer.workspaceId)
        .maybeSingle(),
      projectIds.length
        ? supabase
            .from("milestones")
            .select("id, project_id, title, description, position, due_at, status, submitted_at, approved_at, created_at, updated_at")
            .in("project_id", projectIds)
            .order("position", { ascending: true })
        : Promise.resolve({ data: [] }),
      projectIds.length
        ? supabase
            .from("deliverables")
            .select("id, project_id, milestone_id, title, description, body, status, submitted_at, approved_at, created_at, updated_at")
            .in("project_id", projectIds)
            .order("updated_at", { ascending: false })
        : Promise.resolve({ data: [] }),
      projectIds.length
        ? supabase
            .from("comments")
            .select("id, project_id, milestone_id, deliverable_id, author_user_id, body, created_at")
            .in("project_id", projectIds)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),
      projectIds.length
        ? supabase
            .from("activity_events")
            .select("id, workspace_id, project_id, actor_user_id, event_type, entity_type, entity_id, visibility, payload, created_at")
            .in("project_id", projectIds)
            .order("created_at", { ascending: false })
            .limit(12)
        : Promise.resolve({ data: [] }),
    ]);

  return {
    viewer,
    workspace: mapWorkspace(workspaceResult.data as Record<string, unknown> | null),
    subscription: mapSubscription(subscriptionResult.data as Record<string, unknown> | null),
    projects: mapRowKeys(accessibleProjects) as PortalData["projects"],
    milestones: mapRowKeys(milestonesResult.data as Record<string, unknown>[]) as PortalData["milestones"],
    deliverables: mapRowKeys(deliverablesResult.data as Record<string, unknown>[]) as PortalData["deliverables"],
    comments: mapRowKeys(commentsResult.data as Record<string, unknown>[]) as PortalData["comments"],
    events: mapRowKeys(eventsResult.data as Record<string, unknown>[]) as PortalData["events"],
  };
});

export async function requirePortalViewer() {
  const data = await getPortalData();

  if (data.viewer.mode === "live" && !data.viewer.isAuthenticated) {
    redirect("/auth/sign-in");
  }

  if (data.viewer.mode === "live" && !["client", "admin"].includes(data.viewer.role)) {
    redirect("/workspace");
  }

  return data;
}

export const getAdminData = cache(async (): Promise<AdminData> => {
  if (!hasPublicSupabaseEnv()) {
    return getDemoAdminData();
  }

  const viewer = await loadViewer();
  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    return getDemoAdminData();
  }

  const [workspaces, profiles, subscriptions, latestEvents] = await Promise.all([
    supabase.from("workspaces").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("user_id", { count: "exact", head: true }),
    supabase.from("subscriptions").select("id", { count: "exact", head: true }),
    supabase
      .from("activity_events")
      .select("id, workspace_id, project_id, actor_user_id, event_type, entity_type, entity_id, visibility, payload, created_at")
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  return {
    viewer,
    workspaces: workspaces.count ?? 0,
    profiles: profiles.count ?? 0,
    subscriptions: subscriptions.count ?? 0,
    latestEvents: mapRowKeys(latestEvents.data) as AdminData["latestEvents"],
  };
});

export async function requireAdminViewer() {
  const data = await getAdminData();

  if (data.viewer.mode === "live" && !data.viewer.isAuthenticated) {
    redirect("/auth/sign-in");
  }

  if (data.viewer.mode === "live" && data.viewer.role !== "admin") {
    redirect("/workspace");
  }

  return data;
}

export function getProjectById(projects: ProjectRecord[], projectId: string) {
  return projects.find((project) => project.id === projectId) ?? null;
}
