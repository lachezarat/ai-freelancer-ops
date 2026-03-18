import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { StatCard } from "@/components/ui/stat-card";
import { getViewer, getWorkspaceData } from "@/lib/data/app-data";
import { titleCase } from "@/lib/utils";

export default async function Home() {
  const viewer = await getViewer();
  const workspaceData = await getWorkspaceData();

  return (
    <main className="grain min-h-screen px-6 py-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <section className="grid gap-6 border border-line bg-paper p-8 lg:grid-cols-[1.3fr_0.7fr]">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone={viewer.mode === "demo" ? "neutral" : "signal"}>
                {viewer.mode === "demo" ? "Preview mode" : "Live auth"}
              </Badge>
              <Badge tone="neutral">{titleCase(viewer.planCode)}</Badge>
            </div>
            <h1 className="mt-6 max-w-4xl text-5xl font-semibold leading-none tracking-[-0.06em] text-ink sm:text-7xl">
              Shared Supabase backend. Stripe lifecycle. Protected AI tools. Realtime client ops.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
              AI Freelancer Ops is a backend-first SaaS proving multi-role RLS, subscription gating,
              Edge Function provider security, session persistence, and live collaboration under one
              workspace model.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={viewer.role === "client" ? "/portal" : "/workspace"}
                className="button-primary border px-5 py-3 text-sm font-medium uppercase tracking-[0.18em]"
              >
                Enter {viewer.role === "client" ? "portal" : "workspace"}
              </Link>
              <Link
                href="/tools"
                className="button-quiet border px-5 py-3 text-sm font-medium uppercase tracking-[0.18em]"
              >
                Explore AI tools
              </Link>
            </div>
          </div>
          <div className="grid gap-4">
            <StatCard
              label="Clients"
              value={String(workspaceData.accessSnapshot.clientCount)}
              detail="Scoped by RLS and limited by plan entitlements."
            />
            <StatCard
              label="Active projects"
              value={String(workspaceData.accessSnapshot.activeProjectCount)}
              detail="Freelancer-owned workspace with client assignment join paths."
              accent="ink"
            />
            <StatCard
              label="AI runs this month"
              value={String(workspaceData.accessSnapshot.monthlyAiRunCount)}
              detail="Executed through Supabase Edge Functions, never directly in the browser."
              accent="success"
            />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <Panel title="Freelancer Workspace" kicker="Surface 01">
            <p className="text-sm leading-7 text-muted">
              Manage clients, projects, milestones, deliverables, and activity streams under strict
              workspace ownership boundaries.
            </p>
          </Panel>
          <Panel title="Client Portal" kicker="Surface 02">
            <p className="text-sm leading-7 text-muted">
              Review assigned work only, leave feedback, and approve deliverables without touching
              billing or unrelated data.
            </p>
          </Panel>
          <Panel title="AI Tools Suite" kicker="Surface 03">
            <p className="text-sm leading-7 text-muted">
              Proposal generation, brief analysis, and delivery checklists routed through protected
              Gemini proxy functions with plan-aware gating.
            </p>
          </Panel>
        </section>
      </div>
    </main>
  );
}
