import Link from "next/link";
import { createProjectAction } from "@/app/actions";
import { ActivityFeed } from "@/components/realtime/activity-feed";
import { EmptyState } from "@/components/ui/empty-state";
import { Panel } from "@/components/ui/panel";
import { StatCard } from "@/components/ui/stat-card";
import { requireWorkspaceViewer } from "@/lib/data/app-data";
import { formatDate, titleCase } from "@/lib/utils";

export default async function WorkspacePage() {
  const data = await requireWorkspaceViewer();

  return (
    <>
      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Panel title="Workspace overview" kicker="Freelancer surface">
          <p className="max-w-2xl text-sm leading-7 text-muted">
            The workspace is the ownership anchor for RLS, Stripe subscriptions, AI entitlements, and
            realtime activity. Everything below is keyed to the same Supabase auth session.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Plan"
              value={titleCase(data.subscription.planCode)}
              detail={`Subscription status: ${data.subscription.status}`}
            />
            <StatCard
              label="Clients"
              value={String(data.accessSnapshot.clientCount)}
              detail={
                data.accessSnapshot.clientLimit === null
                  ? "Unlimited on current plan"
                  : `${data.accessSnapshot.clientLimit} total allowed`
              }
              accent="ink"
            />
            <StatCard
              label="AI usage"
              value={String(data.accessSnapshot.monthlyAiRunCount)}
              detail={
                data.accessSnapshot.monthlyAiRunLimit === null
                  ? "No monthly cap"
                  : `${data.accessSnapshot.monthlyAiRunLimit} monthly runs`
              }
              accent="success"
            />
          </div>
        </Panel>
        <Panel title="Create project" kicker="Quick action">
          <form action={createProjectAction} className="space-y-3">
            <input
              name="title"
              type="text"
              placeholder="Project title"
              className="w-full border border-line bg-canvas px-4 py-3 text-sm outline-none focus:border-ink"
              required
            />
            <textarea
              name="description"
              placeholder="Project summary"
              className="min-h-28 w-full border border-line bg-canvas px-4 py-3 text-sm outline-none focus:border-ink"
            />
            <input
              name="dueOn"
              type="date"
              className="w-full border border-line bg-canvas px-4 py-3 text-sm outline-none focus:border-ink"
            />
            <button className="button-primary w-full border px-4 py-3 text-sm font-medium uppercase tracking-[0.18em]">
              Add project
            </button>
          </form>
        </Panel>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Panel title="Projects" kicker="Scoped by workspace">
          <div className="grid gap-4">
            {data.projects.length ? (
              data.projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/workspace/projects/${project.id}`}
                  className="border border-line bg-canvas p-4 transition hover:border-ink"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-ink">{project.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-muted">{project.description}</p>
                    </div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
                      {titleCase(project.status)}
                    </p>
                  </div>
                  <p className="mt-4 text-xs uppercase tracking-[0.24em] text-muted">
                    Due {formatDate(project.dueOn)}
                  </p>
                </Link>
              ))
            ) : (
              <EmptyState
                title="No projects yet"
                body="Create the first workspace project to start testing client assignment, milestone review, and realtime activity."
              />
            )}
          </div>
        </Panel>

        <Panel title="Realtime ops" kicker="Activity channel">
          <ActivityFeed
            workspaceId={data.workspace?.id ?? null}
            initialEvents={data.events}
            realtimeEnabled={data.accessSnapshot.realtimeEnabled}
          />
        </Panel>
      </section>
    </>
  );
}
