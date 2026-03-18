import { notFound } from "next/navigation";
import {
  createCommentAction,
  createDeliverableAction,
  createMilestoneAction,
  submitDeliverableAction,
} from "@/app/actions";
import { EmptyState } from "@/components/ui/empty-state";
import { Panel } from "@/components/ui/panel";
import { requireWorkspaceViewer } from "@/lib/data/app-data";
import { formatDate, titleCase } from "@/lib/utils";

export default async function WorkspaceProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const data = await requireWorkspaceViewer();
  const project = data.projects.find((item) => item.id === projectId);

  if (!project) {
    notFound();
  }

  const milestones = data.milestones.filter((milestone) => milestone.projectId === project.id);
  const deliverables = data.deliverables.filter((deliverable) => deliverable.projectId === project.id);
  const comments = data.comments.filter((comment) => comment.projectId === project.id);

  return (
    <div className="space-y-6">
      <Panel title={project.title} kicker="Project detail">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="border border-line bg-canvas p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted">Status</p>
            <p className="mt-3 text-3xl font-semibold text-ink">{titleCase(project.status)}</p>
          </div>
          <div className="border border-line bg-canvas p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted">Due</p>
            <p className="mt-3 text-3xl font-semibold text-ink">{formatDate(project.dueOn)}</p>
          </div>
          <div className="border border-line bg-canvas p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted">Deliverables</p>
            <p className="mt-3 text-3xl font-semibold text-ink">{deliverables.length}</p>
          </div>
        </div>
        <p className="mt-5 max-w-3xl text-sm leading-7 text-muted">{project.description}</p>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Panel title="Milestones and deliverables" kicker="Execution">
          <form action={createMilestoneAction} className="mb-6 grid gap-3 border border-line bg-canvas p-4">
            <input type="hidden" name="projectId" value={project.id} />
            <input
              name="title"
              type="text"
              placeholder="New milestone title"
              className="w-full border border-line bg-paper px-4 py-3 text-sm outline-none focus:border-ink"
              required
            />
            <textarea
              name="description"
              placeholder="Milestone description"
              className="min-h-24 w-full border border-line bg-paper px-4 py-3 text-sm outline-none focus:border-ink"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                name="dueAt"
                type="datetime-local"
                className="w-full border border-line bg-paper px-4 py-3 text-sm outline-none focus:border-ink"
              />
              <input
                name="position"
                type="number"
                min={1}
                defaultValue={milestones.length + 1}
                className="w-full border border-line bg-paper px-4 py-3 text-sm outline-none focus:border-ink"
              />
            </div>
            <button className="button-primary border px-4 py-3 text-sm font-medium uppercase tracking-[0.18em]">
              Add milestone
            </button>
          </form>

          <div className="space-y-4">
            {milestones.length ? (
              milestones.map((milestone) => {
                const milestoneDeliverables = deliverables.filter(
                  (deliverable) => deliverable.milestoneId === milestone.id,
                );

                return (
                  <div key={milestone.id} className="border border-line bg-canvas p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-ink">{milestone.title}</h3>
                        <p className="mt-1 text-sm text-muted">{milestone.description}</p>
                      </div>
                      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
                        {titleCase(milestone.status)}
                      </p>
                    </div>

                    <div className="mt-4 space-y-3">
                      {milestoneDeliverables.map((deliverable) => (
                        <div key={deliverable.id} className="border border-line bg-paper p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h4 className="text-base font-semibold text-ink">{deliverable.title}</h4>
                              <p className="mt-1 text-sm text-muted">{deliverable.description}</p>
                            </div>
                            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
                              {titleCase(deliverable.status)}
                            </p>
                          </div>
                          {deliverable.body ? (
                            <pre className="mt-4 overflow-x-auto border border-line bg-canvas p-3 font-mono text-xs text-muted">
                              {deliverable.body}
                            </pre>
                          ) : null}
                          {deliverable.status === "draft" ? (
                            <form action={submitDeliverableAction} className="mt-4">
                              <input type="hidden" name="deliverableId" value={deliverable.id} />
                              <input type="hidden" name="projectId" value={project.id} />
                              <input type="hidden" name="milestoneId" value={milestone.id} />
                              <button className="button-secondary border px-4 py-2 text-sm font-medium">
                                Submit for review
                              </button>
                            </form>
                          ) : null}
                        </div>
                      ))}
                    </div>

                    <form action={createDeliverableAction} className="mt-4 grid gap-3 border border-line bg-paper p-4">
                      <input type="hidden" name="projectId" value={project.id} />
                      <input type="hidden" name="milestoneId" value={milestone.id} />
                      <input
                        name="title"
                        type="text"
                        placeholder="Deliverable title"
                        className="w-full border border-line bg-canvas px-4 py-3 text-sm outline-none focus:border-ink"
                        required
                      />
                      <input
                        name="description"
                        type="text"
                        placeholder="Deliverable summary"
                        className="w-full border border-line bg-canvas px-4 py-3 text-sm outline-none focus:border-ink"
                      />
                      <textarea
                        name="body"
                        placeholder="Deliverable content"
                        className="min-h-28 w-full border border-line bg-canvas px-4 py-3 text-sm outline-none focus:border-ink"
                      />
                      <button className="button-primary border px-4 py-3 text-sm font-medium uppercase tracking-[0.18em]">
                        Add deliverable
                      </button>
                    </form>
                  </div>
                );
              })
            ) : (
              <EmptyState
                title="No milestones yet"
                body="Add the first milestone to define the review and delivery path for this project."
              />
            )}
          </div>
        </Panel>

        <Panel title="Shared comments" kicker="Visible to assigned clients">
          <form action={createCommentAction} className="mb-6 space-y-3 border border-line bg-canvas p-4">
            <input type="hidden" name="projectId" value={project.id} />
            <input type="hidden" name="path" value={`/workspace/projects/${project.id}`} />
            <textarea
              name="body"
              placeholder="Add a project note"
              className="min-h-28 w-full border border-line bg-paper px-4 py-3 text-sm outline-none focus:border-ink"
              required
            />
            <button className="button-primary w-full border px-4 py-3 text-sm font-medium uppercase tracking-[0.18em]">
              Post comment
            </button>
          </form>

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
                title="No comments yet"
                body="Comments posted here will be visible to authorized portal viewers and the workspace owner."
              />
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
