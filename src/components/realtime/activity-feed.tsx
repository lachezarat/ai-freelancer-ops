"use client";

import { useEffect, useMemo, useState } from "react";
import type { ActivityEventRecord } from "@/lib/types";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { formatRelativeTime, titleCase } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

function mapRealtimeEvent(row: Record<string, unknown>): ActivityEventRecord {
  return {
    id: String(row.id),
    workspaceId: String(row.workspace_id),
    projectId: row.project_id ? String(row.project_id) : null,
    actorUserId: row.actor_user_id ? String(row.actor_user_id) : null,
    eventType: String(row.event_type),
    entityType: String(row.entity_type),
    entityId: String(row.entity_id),
    visibility: row.visibility === "project" ? "project" : "workspace",
    payload: (row.payload as Record<string, unknown> | null) ?? {},
    createdAt: String(row.created_at),
  };
}

function humanizeEventType(eventType: string) {
  return titleCase(eventType.replace(/\./g, " "));
}

function getToolLabel(toolType: unknown) {
  switch (String(toolType ?? "")) {
    case "proposal_generator":
      return "Proposal Generator";
    case "brief_analyzer":
      return "Brief Analyzer";
    case "checklist_builder":
      return "Checklist Builder";
    default:
      return "AI tool";
  }
}

function getActivityCopy(event: ActivityEventRecord) {
  const rawTitle = event.payload?.title;
  const title =
    typeof rawTitle === "string" && rawTitle.trim().length > 0 ? rawTitle.trim() : null;
  const rawStatus = event.payload?.status;
  const status =
    typeof rawStatus === "string" && rawStatus.trim().length > 0 ? titleCase(rawStatus) : null;

  switch (event.eventType) {
    case "clients.insert":
      return {
        title: "Client added",
        body: title ? `${title} was added to the workspace.` : "A new client was added to the workspace.",
      };
    case "clients.update":
      return {
        title: "Client updated",
        body: title ? `${title} was updated.` : "A client record was updated.",
      };
    case "projects.insert":
      return {
        title: "Project created",
        body: title ? `${title} was created.` : "A new project was created.",
      };
    case "projects.update":
      return {
        title: "Project updated",
        body: title && status ? `${title} is now ${status}.` : title ? `${title} was updated.` : "A project was updated.",
      };
    case "milestones.insert":
      return {
        title: "Milestone added",
        body: title ? `${title} was added to the project.` : "A new milestone was added.",
      };
    case "milestones.update":
      return {
        title: "Milestone updated",
        body: title && status ? `${title} is now ${status}.` : title ? `${title} was updated.` : "A milestone was updated.",
      };
    case "deliverables.insert":
      return {
        title: "Deliverable added",
        body: title ? `${title} was added to the milestone.` : "A new deliverable was added.",
      };
    case "deliverables.update":
      return {
        title: "Deliverable updated",
        body: title && status ? `${title} is now ${status}.` : title ? `${title} was updated.` : "A deliverable was updated.",
      };
    case "deliverables.reviewed":
      return {
        title: "Deliverable reviewed",
        body: status ? `The deliverable was marked ${status}.` : "A deliverable review was recorded.",
      };
    case "comments.insert":
      return {
        title: "New comment",
        body: "A project comment was added.",
      };
    case "tool_runs.succeeded": {
      const toolLabel = getToolLabel(event.payload?.toolType);

      return {
        title: `${toolLabel} completed`,
        body: "The latest output is ready in AI Tools.",
      };
    }
    default:
      return {
        title: humanizeEventType(event.eventType),
        body: title ?? "System event",
      };
  }
}

export function ActivityFeed({
  workspaceId,
  projectId,
  initialEvents,
  realtimeEnabled,
}: {
  workspaceId: string | null;
  projectId?: string | null;
  initialEvents: ActivityEventRecord[];
  realtimeEnabled: boolean;
}) {
  const [events, setEvents] = useState(initialEvents);
  const client = useMemo(() => getSupabaseBrowserClient(), []);

  useEffect(() => {
    if (!client || !workspaceId || !realtimeEnabled) {
      return;
    }

    const filter = projectId
      ? `project_id=eq.${projectId}`
      : `workspace_id=eq.${workspaceId}`;
    const channel = client
      .channel(`activity-${projectId ?? workspaceId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "activity_events",
          filter,
        },
        (payload: { new: Record<string, unknown> }) => {
          setEvents((current) => [mapRealtimeEvent(payload.new), ...current].slice(0, 12));
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [client, projectId, realtimeEnabled, workspaceId]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-muted">Activity feed</p>
        <Badge tone={realtimeEnabled ? "success" : "neutral"}>
          {realtimeEnabled ? "Realtime on" : "Realtime off"}
        </Badge>
      </div>
      <div className="space-y-3">
        {events.length ? (
          events.map((event) => {
            const copy = getActivityCopy(event);

            return (
              <div key={event.id} className="border border-line bg-paper px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">{copy.title}</p>
                    <p className="mt-1 text-sm text-muted">{copy.body}</p>
                  </div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
                    {formatRelativeTime(event.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="border border-dashed border-line bg-paper px-4 py-6 text-sm text-muted">
            No activity yet.
          </div>
        )}
      </div>
    </div>
  );
}
