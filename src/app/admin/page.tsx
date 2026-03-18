import { Panel } from "@/components/ui/panel";
import { StatCard } from "@/components/ui/stat-card";
import { requireAdminViewer } from "@/lib/data/app-data";
import { formatDate, titleCase } from "@/lib/utils";

export default async function AdminPage() {
  const data = await requireAdminViewer();

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="Workspaces" value={String(data.workspaces)} detail="Owned workspace records." />
        <StatCard label="Profiles" value={String(data.profiles)} detail="Auth-linked platform users." accent="ink" />
        <StatCard
          label="Subscriptions"
          value={String(data.subscriptions)}
          detail="Stripe-synced billing rows."
          accent="success"
        />
      </section>
      <Panel title="Latest system events" kicker="Admin visibility">
        <div className="space-y-3">
          {data.latestEvents.map((event) => (
            <div key={event.id} className="border border-line bg-canvas p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-ink">{titleCase(event.eventType)}</h3>
                  <p className="mt-2 text-sm text-muted">
                    {event.payload?.title ? String(event.payload.title) : "Activity event payload"}
                  </p>
                </div>
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
                  {formatDate(event.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
