export type ViewerRole = "guest" | "admin" | "freelancer" | "client";
export type ViewerMode = "demo" | "live";
export type PlanCode = "free" | "pro" | "studio";

export type ClientStatus = "pending_invite" | "active" | "archived";
export type ProjectStatus = "draft" | "active" | "paused" | "completed" | "archived";
export type MilestoneStatus = "planned" | "in_progress" | "in_review" | "approved" | "blocked";
export type DeliverableStatus = "draft" | "submitted" | "changes_requested" | "approved";
export type ToolType = "proposal_generator" | "brief_analyzer" | "checklist_builder";

export interface Viewer {
  mode: ViewerMode;
  isAuthenticated: boolean;
  userId: string | null;
  email: string | null;
  fullName: string;
  role: ViewerRole;
  workspaceId: string | null;
  workspaceName: string | null;
  workspaceSlug: string | null;
  planCode: PlanCode;
}

export interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  status: string;
}

export interface SubscriptionSummary {
  planCode: PlanCode;
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
}

export interface AccessSnapshot {
  planCode: PlanCode;
  clientLimit: number | null;
  clientCount: number;
  activeProjectLimit: number | null;
  activeProjectCount: number;
  monthlyAiRunLimit: number | null;
  monthlyAiRunCount: number;
  portalEnabled: boolean;
  aiEnabled: boolean;
  realtimeEnabled: boolean;
  premiumAiMode: boolean;
}

export interface ClientRecord {
  id: string;
  workspaceId: string;
  portalUserId: string | null;
  email: string;
  name: string;
  companyName: string | null;
  notes: string | null;
  status: ClientStatus;
  invitedAt: string | null;
  createdAt: string;
}

export interface ProjectRecord {
  id: string;
  workspaceId: string;
  title: string;
  description: string | null;
  status: ProjectStatus;
  startsOn: string | null;
  dueOn: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MilestoneRecord {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  position: number;
  dueAt: string | null;
  status: MilestoneStatus;
  submittedAt: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeliverableRecord {
  id: string;
  projectId: string;
  milestoneId: string;
  title: string;
  description: string | null;
  body: string | null;
  status: DeliverableStatus;
  submittedAt: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CommentRecord {
  id: string;
  projectId: string;
  milestoneId: string | null;
  deliverableId: string | null;
  authorUserId: string;
  body: string;
  createdAt: string;
}

export interface ActivityEventRecord {
  id: string;
  workspaceId: string;
  projectId: string | null;
  actorUserId: string | null;
  eventType: string;
  entityType: string;
  entityId: string;
  visibility: "workspace" | "project";
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface ToolSessionRecord {
  id: string;
  workspaceId: string;
  ownerUserId: string;
  toolType: ToolType;
  title: string;
  latestStatus: string;
  inputPreview: string | null;
  lastRunAt: string | null;
  createdAt: string;
}

export interface ToolRunRecord {
  id: string;
  sessionId: string;
  workspaceId: string;
  ownerUserId: string;
  toolType: ToolType;
  status: string;
  premiumMode: boolean;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  provider: string | null;
  model: string | null;
  usageInputTokens: number | null;
  usageOutputTokens: number | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface WorkspaceData {
  viewer: Viewer;
  workspace: WorkspaceSummary | null;
  subscription: SubscriptionSummary;
  accessSnapshot: AccessSnapshot;
  clients: ClientRecord[];
  projects: ProjectRecord[];
  milestones: MilestoneRecord[];
  deliverables: DeliverableRecord[];
  comments: CommentRecord[];
  events: ActivityEventRecord[];
  toolSessions: ToolSessionRecord[];
  toolRuns: ToolRunRecord[];
}

export interface PortalData {
  viewer: Viewer;
  workspace: WorkspaceSummary | null;
  subscription: SubscriptionSummary;
  projects: ProjectRecord[];
  milestones: MilestoneRecord[];
  deliverables: DeliverableRecord[];
  comments: CommentRecord[];
  events: ActivityEventRecord[];
}

export interface AdminData {
  viewer: Viewer;
  workspaces: number;
  profiles: number;
  subscriptions: number;
  latestEvents: ActivityEventRecord[];
}
