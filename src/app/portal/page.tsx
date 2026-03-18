import Link from "next/link";
import { ActivityFeed } from "@/components/realtime/activity-feed";
import { EmptyState } from "@/components/ui/empty-state";
import { Panel } from "@/components/ui/panel";
import { requirePortalViewer } from "@/lib/data/app-data";
import { formatDate, titleCase } from "@/lib/utils";

export default async function PortalPage() {
  const data = await requirePortalViewer();

  return (
    <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <Panel title="Assigned projects" kicker="Client portal">
        <div id="projects" className="space-y-3">
          {data.projects.length ? (
            data.projects.map((project) => (
              <Link
                key={project.id}
                href={`/portal/projects/${project.id}`}
                className="border border-line bg-canvas p-4 transition hover:border-ink"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-ink">{project.title}</h3>
                    <p className="mt-2 text-sm text-muted">{project.description}</p>
                  </div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
                    {titleCase(project.status)}
                  </p>
                </div>
                <p className="mt-4 text-xs uppercase tracking-[0.22em] text-muted">
                  Due {formatDate(project.dueOn)}
                </p>
              </Link>
            ))
          ) : (
            <EmptyState
              title="No accessible projects"
              body="Client accounts only see projects connected through project_clients and verified by RLS."
            />
          )}
        </div>
      </Panel>

      <Panel title="Live status feed" kicker="Realtime boundary">
        <ActivityFeed
          workspaceId={data.workspace?.id ?? null}
          initialEvents={data.events}
          realtimeEnabled={true}
        />
      </Panel>
    </div>
  );
}
