import { runAiToolAction } from "@/app/actions";
import { AppShell } from "@/components/shell/app-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { Panel } from "@/components/ui/panel";
import { requireWorkspaceViewer } from "@/lib/data/app-data";
import type { ToolRunRecord } from "@/lib/types";
import { titleCase } from "@/lib/utils";

const tools = [
  {
    toolType: "proposal_generator",
    title: "Proposal Generator",
    fields: [
      { name: "projectType", placeholder: "Project type" },
      { name: "clientGoals", placeholder: "Client goals" },
      { name: "scopeNotes", placeholder: "Scope notes" },
      { name: "timeline", placeholder: "Timeline" },
      { name: "budgetRange", placeholder: "Budget range" },
    ],
  },
  {
    toolType: "brief_analyzer",
    title: "Project Brief Analyzer",
    fields: [
      { name: "brief", placeholder: "Client brief" },
      { name: "constraints", placeholder: "Optional constraints" },
    ],
  },
  {
    toolType: "checklist_builder",
    title: "Delivery Checklist Builder",
    fields: [
      { name: "projectType", placeholder: "Project type" },
      { name: "scope", placeholder: "Scope" },
      { name: "deliverables", placeholder: "Deliverables" },
      { name: "deadline", placeholder: "Deadline" },
    ],
  },
];

type ToolsPageProps = {
  searchParams: Promise<{
    error?: string;
    detail?: string;
  }>;
};

function getToolsMessage(error?: string, detail?: string) {
  if (error === "premium_mode_requires_studio") {
    return {
      tone: "notice",
      title: "Premium mode needs Studio",
      body: "The workspace is on Pro. Upgrade to Studio before using premium AI mode.",
      detail: null,
    } as const;
  }

  if (error === "tool_run_failed") {
    return {
      tone: "error",
      title: "AI tool run failed",
      body: "The tool request reached the backend but did not complete successfully.",
      detail: detail ?? null,
    } as const;
  }

  return null;
}

function getRunPreview(run: ToolRunRecord) {
  if (run.output?.summary) {
    return String(run.output.summary);
  }

  if (run.output?.executiveSummary) {
    return String(run.output.executiveSummary);
  }

  if (run.output?.overview) {
    return String(run.output.overview);
  }

  return "Structured output stored in tool_runs.output";
}

export default async function ToolsPage({ searchParams }: ToolsPageProps) {
  const data = await requireWorkspaceViewer();
  const { error, detail } = await searchParams;
  const message = getToolsMessage(error, detail);

  return (
    <AppShell surface="workspace" viewer={data.viewer}>
      <div className="space-y-6">
        <Panel title="Run AI tools" kicker="Gemini through Supabase Edge Functions">
          {message ? (
            <div
              className={`mb-4 border px-4 py-4 ${
                message.tone === "error"
                  ? "border-[#b94a48] bg-[#fff1ef] text-[#7a1f1b]"
                  : "border-[#a88b37] bg-[#fff8dd] text-[#6e5714]"
              }`}
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.22em]">Tool status</p>
              <p className="mt-2 text-sm font-semibold">{message.title}</p>
              <p className="mt-2 text-sm leading-6">{message.body}</p>
              {message.detail ? (
                <p className="mt-3 border-t border-current/20 pt-3 text-sm leading-6">
                  Detail: {message.detail}
                </p>
              ) : null}
            </div>
          ) : null}
          <div className="grid gap-4 xl:grid-cols-3">
            {tools.map((tool) => (
              <form key={tool.toolType} action={runAiToolAction} className="border border-line bg-canvas p-5">
                <input type="hidden" name="toolType" value={tool.toolType} />
                <h3 className="text-xl font-semibold text-ink">{tool.title}</h3>
                <div className="mt-4 space-y-3">
                  {tool.fields.map((field) =>
                    field.name === "brief" || field.name === "scopeNotes" || field.name === "deliverables" ? (
                      <textarea
                        key={field.name}
                        name={field.name}
                        placeholder={field.placeholder}
                        className="min-h-24 w-full border border-line bg-paper px-4 py-3 text-sm outline-none focus:border-ink"
                        required
                      />
                    ) : (
                      <input
                        key={field.name}
                        name={field.name}
                        type="text"
                        placeholder={field.placeholder}
                        className="w-full border border-line bg-paper px-4 py-3 text-sm outline-none focus:border-ink"
                        required
                      />
                    ),
                  )}
                  <label className="flex items-center gap-3 border border-line bg-paper px-4 py-3 text-sm text-muted">
                    <input
                      type="checkbox"
                      name="premiumMode"
                      disabled={!data.accessSnapshot.premiumAiMode}
                    />
                    {data.accessSnapshot.premiumAiMode
                      ? "Use premium mode if Studio is active"
                      : "Premium mode is available on Studio only"}
                  </label>
                  <button className="button-primary w-full border px-4 py-3 text-sm font-medium uppercase tracking-[0.18em]">
                    Run tool
                  </button>
                </div>
              </form>
            ))}
          </div>
        </Panel>

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Panel title="Session history" kicker="Persistent runs">
            <div className="space-y-3">
              {data.toolSessions.length ? (
                data.toolSessions.map((session) => (
                  <div key={session.id} className="border border-line bg-canvas p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-ink">{session.title}</h3>
                        <p className="mt-2 text-sm text-muted">{session.inputPreview}</p>
                      </div>
                      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
                        {titleCase(session.latestStatus)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  title="No saved sessions"
                  body="Tool runs will create resumable sessions once the Edge Function and Supabase env are configured."
                />
              )}
            </div>
          </Panel>

          <Panel title="Latest outputs" kicker="Run records">
            <div className="space-y-3">
              {data.toolRuns.length ? (
                data.toolRuns.map((run) => (
                  <div key={run.id} className="border border-line bg-canvas p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-ink">{titleCase(run.toolType)}</h3>
                        <p className="mt-2 text-sm text-muted">{getRunPreview(run)}</p>
                      </div>
                      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
                        {titleCase(run.status)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  title="No tool runs yet"
                  body="Run one of the tools above to validate entitlement checks, provider proxying, and session persistence."
                />
              )}
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
