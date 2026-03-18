import type {
  AccessSnapshot,
  ActivityEventRecord,
  AdminData,
  ClientRecord,
  CommentRecord,
  DeliverableRecord,
  MilestoneRecord,
  PlanCode,
  PortalData,
  ProjectRecord,
  SubscriptionSummary,
  ToolRunRecord,
  ToolSessionRecord,
  Viewer,
  WorkspaceData,
  WorkspaceSummary,
} from "@/lib/types";

const now = new Date();

function isoOffset(hoursAgo: number) {
  return new Date(now.getTime() - hoursAgo * 60 * 60 * 1000).toISOString();
}

export const demoWorkspace: WorkspaceSummary = {
  id: "workspace-demo-maya",
  name: "Maya Studio",
  slug: "maya-studio",
  status: "active",
};

export const demoViewerFreelancer: Viewer = {
  mode: "demo",
  isAuthenticated: false,
  userId: "user-demo-maya",
  email: "maya@aifo.local",
  fullName: "Maya Nguyen",
  role: "freelancer",
  workspaceId: demoWorkspace.id,
  workspaceName: demoWorkspace.name,
  workspaceSlug: demoWorkspace.slug,
  planCode: "pro",
};

export const demoViewerClient: Viewer = {
  mode: "demo",
  isAuthenticated: false,
  userId: "user-demo-olivia",
  email: "olivia@northstar.local",
  fullName: "Olivia Hart",
  role: "client",
  workspaceId: demoWorkspace.id,
  workspaceName: demoWorkspace.name,
  workspaceSlug: demoWorkspace.slug,
  planCode: "pro",
};

export const demoViewerAdmin: Viewer = {
  mode: "demo",
  isAuthenticated: false,
  userId: "user-demo-admin",
  email: "admin@aifo.local",
  fullName: "AIFO Admin",
  role: "admin",
  workspaceId: demoWorkspace.id,
  workspaceName: demoWorkspace.name,
  workspaceSlug: demoWorkspace.slug,
  planCode: "studio",
};

export const demoSubscription: SubscriptionSummary = {
  planCode: "pro",
  status: "active",
  cancelAtPeriodEnd: false,
  currentPeriodEnd: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000).toISOString(),
};

export const demoSnapshot: AccessSnapshot = {
  planCode: "pro",
  clientLimit: null,
  clientCount: 2,
  activeProjectLimit: null,
  activeProjectCount: 2,
  monthlyAiRunLimit: 50,
  monthlyAiRunCount: 7,
  portalEnabled: true,
  aiEnabled: true,
  realtimeEnabled: true,
  premiumAiMode: false,
};

export const demoClients: ClientRecord[] = [
  {
    id: "client-demo-olivia",
    workspaceId: demoWorkspace.id,
    portalUserId: "user-demo-olivia",
    email: "olivia@northstar.local",
    name: "Olivia Hart",
    companyName: "Northstar Labs",
    notes: "Primary reviewer for launch proposal and delivery checklist.",
    status: "active",
    invitedAt: isoOffset(72),
    createdAt: isoOffset(96),
  },
  {
    id: "client-demo-noah",
    workspaceId: demoWorkspace.id,
    portalUserId: "user-demo-noah",
    email: "noah@flux.local",
    name: "Noah Patel",
    companyName: "Flux Commerce",
    notes: "Requires weekly portal checkpoints.",
    status: "active",
    invitedAt: isoOffset(48),
    createdAt: isoOffset(72),
  },
];

export const demoProjects: ProjectRecord[] = [
  {
    id: "project-demo-northstar",
    workspaceId: demoWorkspace.id,
    title: "Northstar Launch Support",
    description: "Proposal, client portal, and AI-assisted delivery checklist for launch assets.",
    status: "active",
    startsOn: "2026-03-06",
    dueOn: "2026-03-31",
    createdAt: isoOffset(240),
    updatedAt: isoOffset(3),
  },
  {
    id: "project-demo-flux",
    workspaceId: demoWorkspace.id,
    title: "Flux Messaging Sprint",
    description: "Messaging system refresh with weekly portal approvals.",
    status: "paused",
    startsOn: "2026-02-26",
    dueOn: "2026-04-07",
    createdAt: isoOffset(360),
    updatedAt: isoOffset(29),
  },
];

export const demoMilestones: MilestoneRecord[] = [
  {
    id: "milestone-demo-1",
    projectId: "project-demo-northstar",
    title: "Proposal and timeline",
    description: "Lock scope, timeline, and budget framing.",
    position: 1,
    dueAt: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    status: "in_review",
    submittedAt: isoOffset(20),
    approvedAt: null,
    createdAt: isoOffset(240),
    updatedAt: isoOffset(5),
  },
  {
    id: "milestone-demo-2",
    projectId: "project-demo-flux",
    title: "Message system outline",
    description: "Approve the new messaging hierarchy before production.",
    position: 1,
    dueAt: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString(),
    status: "in_progress",
    submittedAt: null,
    approvedAt: null,
    createdAt: isoOffset(300),
    updatedAt: isoOffset(32),
  },
];

export const demoDeliverables: DeliverableRecord[] = [
  {
    id: "deliverable-demo-1",
    projectId: "project-demo-northstar",
    milestoneId: "milestone-demo-1",
    title: "Launch proposal draft",
    description: "Scope tiers, budget bands, and delivery sequence.",
    body: "## Proposal draft\n\n- Workshop\n- Messaging system\n- Delivery checklist",
    status: "submitted",
    submittedAt: isoOffset(18),
    approvedAt: null,
    createdAt: isoOffset(32),
    updatedAt: isoOffset(18),
  },
  {
    id: "deliverable-demo-2",
    projectId: "project-demo-flux",
    milestoneId: "milestone-demo-2",
    title: "Messaging outline",
    description: "Hero narrative and CTA architecture.",
    body: "## Outline\n\n- Hero message\n- Proof stack\n- CTA system",
    status: "draft",
    submittedAt: null,
    approvedAt: null,
    createdAt: isoOffset(54),
    updatedAt: isoOffset(28),
  },
];

export const demoComments: CommentRecord[] = [
  {
    id: "comment-demo-1",
    projectId: "project-demo-northstar",
    milestoneId: "milestone-demo-1",
    deliverableId: "deliverable-demo-1",
    authorUserId: "user-demo-olivia",
    body: "Tighten the budget framing around the kickoff week.",
    createdAt: isoOffset(12),
  },
  {
    id: "comment-demo-2",
    projectId: "project-demo-flux",
    milestoneId: "milestone-demo-2",
    deliverableId: "deliverable-demo-2",
    authorUserId: "user-demo-maya",
    body: "Holding this until the portal approval workflow is live.",
    createdAt: isoOffset(25),
  },
];

export const demoEvents: ActivityEventRecord[] = [
  {
    id: "event-demo-1",
    workspaceId: demoWorkspace.id,
    projectId: "project-demo-northstar",
    actorUserId: "user-demo-olivia",
    eventType: "deliverables.reviewed",
    entityType: "deliverables",
    entityId: "deliverable-demo-1",
    visibility: "project",
    payload: { status: "changes_requested" },
    createdAt: isoOffset(8),
  },
  {
    id: "event-demo-2",
    workspaceId: demoWorkspace.id,
    projectId: "project-demo-northstar",
    actorUserId: "user-demo-maya",
    eventType: "milestones.update",
    entityType: "milestones",
    entityId: "milestone-demo-1",
    visibility: "project",
    payload: { status: "in_review" },
    createdAt: isoOffset(18),
  },
  {
    id: "event-demo-3",
    workspaceId: demoWorkspace.id,
    projectId: null,
    actorUserId: "user-demo-maya",
    eventType: "tool_runs.succeeded",
    entityType: "tool_runs",
    entityId: "tool-run-demo-1",
    visibility: "workspace",
    payload: { toolType: "proposal_generator" },
    createdAt: isoOffset(2),
  },
];

export const demoToolSessions: ToolSessionRecord[] = [
  {
    id: "tool-session-demo-1",
    workspaceId: demoWorkspace.id,
    ownerUserId: "user-demo-maya",
    toolType: "proposal_generator",
    title: "Proposal: Northstar launch support",
    latestStatus: "succeeded",
    inputPreview: "Launch proposal for Northstar Labs",
    lastRunAt: isoOffset(2),
    createdAt: isoOffset(4),
  },
  {
    id: "tool-session-demo-2",
    workspaceId: demoWorkspace.id,
    ownerUserId: "user-demo-maya",
    toolType: "brief_analyzer",
    title: "Brief: Flux commerce sprint",
    latestStatus: "succeeded",
    inputPreview: "Client brief with messaging constraints",
    lastRunAt: isoOffset(36),
    createdAt: isoOffset(48),
  },
];

export const demoToolRuns: ToolRunRecord[] = [
  {
    id: "tool-run-demo-1",
    sessionId: "tool-session-demo-1",
    workspaceId: demoWorkspace.id,
    ownerUserId: "user-demo-maya",
    toolType: "proposal_generator",
    status: "succeeded",
    premiumMode: false,
    input: {
      projectType: "Launch support",
      clientGoals: "Clear scope and fast approvals",
      timeline: "3 weeks",
      budgetRange: "$6k-$9k",
    },
    output: {
      executiveSummary: "Phased proposal with scope alignment, messaging sprint, and delivery checklist.",
    },
    provider: "gemini",
    model: "gemini-2.0-flash",
    usageInputTokens: 980,
    usageOutputTokens: 512,
    errorMessage: null,
    createdAt: isoOffset(2),
    completedAt: isoOffset(2),
  },
];

export function buildSubscription(planCode: PlanCode = "pro"): SubscriptionSummary {
  return {
    ...demoSubscription,
    planCode,
  };
}

export function getDemoWorkspaceData(): WorkspaceData {
  return {
    viewer: demoViewerFreelancer,
    workspace: demoWorkspace,
    subscription: demoSubscription,
    accessSnapshot: demoSnapshot,
    clients: demoClients,
    projects: demoProjects,
    milestones: demoMilestones,
    deliverables: demoDeliverables,
    comments: demoComments,
    events: demoEvents,
    toolSessions: demoToolSessions,
    toolRuns: demoToolRuns,
  };
}

export function getDemoPortalData(): PortalData {
  return {
    viewer: demoViewerClient,
    workspace: demoWorkspace,
    subscription: demoSubscription,
    projects: demoProjects.filter((project) => project.id === "project-demo-northstar"),
    milestones: demoMilestones.filter((milestone) => milestone.projectId === "project-demo-northstar"),
    deliverables: demoDeliverables.filter((deliverable) => deliverable.projectId === "project-demo-northstar"),
    comments: demoComments.filter((comment) => comment.projectId === "project-demo-northstar"),
    events: demoEvents.filter((event) => event.projectId === "project-demo-northstar"),
  };
}

export function getDemoAdminData(): AdminData {
  return {
    viewer: demoViewerAdmin,
    workspaces: 1,
    profiles: 4,
    subscriptions: 1,
    latestEvents: demoEvents,
  };
}
