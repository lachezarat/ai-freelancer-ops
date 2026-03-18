import { notFound } from "next/navigation";
import { reviewDeliverableAction } from "@/app/actions";
import { EmptyState } from "@/components/ui/empty-state";
import { Panel } from "@/components/ui/panel";
import { requirePortalViewer } from "@/lib/data/app-data";
import { formatDate, titleCase } from "@/lib/utils";

export default async function PortalProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const data = await requirePortalViewer();
  const project = data.projects.find((item) => item.id === projectId);

  if (!project) {
    notFound();
  }

  const milestones = data.milestones.filter((milestone) => milestone.projectId === projectId);
  const deliverables = data.deliverables.filter((deliverable) => deliverable.projectId === projectId);
  const comments = data.comments.filter((comment) => comment.projectId === projectId);

  return (
    <div className="space-y-6">
      <Panel title={project.title} kicker="Portal review">
        <p className="max-w-3xl text-sm leading-7 text-muted">{project.description}</p>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Panel title="Review queue" kicker="Assigned deliverables">
          <div className="space-y-4">
            {deliverables.length ? (
              deliverables.map((deliverable) => {
                const milestone = milestones.find((item) => item.id === deliverable.milestoneId);

                return (
                  <div key={deliverable.id} className="border border-line bg-canvas p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-ink">{deliverable.title}</h3>
                        <p className="mt-1 text-sm text-muted">
                          {milestone?.title ?? "Milestone"} · {titleCase(deliverable.status)}
                        </p>
                      </div>
                      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
                        {formatDate(deliverable.submittedAt)}
                      </p>
                    </div>
                    {deliverable.body ? (
                      <pre className="mt-4 overflow-x-auto border border-line bg-paper p-3 font-mono text-xs text-muted">
                        {deliverable.body}
                      </pre>
                    ) : null}
                    {deliverable.status === "submitted" ? (
                      <form action={reviewDeliverableAction} className="mt-4 space-y-3 border border-line bg-paper p-4">
                        <input type="hidden" name="deliverableId" value={deliverable.id} />
                        <input type="hidden" name="path" value={`/portal/projects/${project.id}`} />
                        <select
                          name="decision"
                          className="w-full border border-line bg-canvas px-4 py-3 text-sm outline-none focus:border-ink"
                          defaultValue="approved"
                        >
                          <option value="approved">Approve</option>
                          <option value="changes_requested">Request changes</option>
                        </select>
                        <textarea
                          name="comment"
                          placeholder="Review note"
                          className="min-h-24 w-full border border-line bg-canvas px-4 py-3 text-sm outline-none focus:border-ink"
                        />
                        <button className="button-primary w-full border px-4 py-3 text-sm font-medium uppercase tracking-[0.18em]">
                          Submit review
                        </button>
                      </form>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <EmptyState
                title="Nothing to review yet"
                body="Submitted deliverables will appear here once the freelancer sends them for review."
              />
            )}
          </div>
        </Panel>

        <Panel title="Review notes" kicker="Shared comments">
          <div className="space-y-3">
            {comments.length ? (
              comments.map((comment) => (
                <div key={comment.id} className="border border-line bg-canvas p-4">
                  <p className="text-sm leading-7 text-ink">{comment.body}</p>
                  <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
                    {formatDate(comment.createdAt)}
                  </p>
                </div>
              ))
            ) : (
              <EmptyState
                title="No shared notes yet"
                body="Comments and approvals are stored on the same project graph and are only visible to authorized users."
              />
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
