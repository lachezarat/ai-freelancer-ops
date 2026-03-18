import { createClientAction } from "@/app/actions";
import { EmptyState } from "@/components/ui/empty-state";
import { Panel } from "@/components/ui/panel";
import { requireWorkspaceViewer } from "@/lib/data/app-data";
import { formatDate, titleCase } from "@/lib/utils";

type ClientsPageProps = {
  searchParams: Promise<{
    notice?: string;
    error?: string;
    detail?: string;
  }>;
};

function getClientsMessage(notice?: string, error?: string, detail?: string) {
  if (notice === "client_invite_sent") {
    return {
      tone: "notice",
      title: "Portal invite sent",
      body: "The client record was saved and the portal invite email was sent.",
      detail: null,
    } as const;
  }

  if (notice === "existing_client_linked") {
    return {
      tone: "notice",
      title: "Existing client account linked",
      body: "This email already had a client account, so the workspace client record was linked instead of sending a new invite.",
      detail: null,
    } as const;
  }

  if (notice === "client_portal_already_enabled") {
    return {
      tone: "notice",
      title: "Portal access already enabled",
      body: "This client record is already linked to a portal user.",
      detail: null,
    } as const;
  }

  switch (error) {
    case "client_already_exists":
      return {
        tone: "error",
        title: "Client already exists",
        body: "A client with this email already exists in the workspace.",
        detail,
      } as const;
    case "client_email_in_use":
      return {
        tone: "error",
        title: "Email belongs to another account type",
        body: "That email already belongs to a non-client account and cannot be invited into the client portal.",
        detail,
      } as const;
    case "client_account_linked_elsewhere":
    case "client_account_already_linked":
      return {
        tone: "error",
        title: "Client account is already linked",
        body: "That client account is already attached to another client record.",
        detail,
      } as const;
    case "client_invite_failed":
      return {
        tone: "error",
        title: "Portal invite failed",
        body: "The client record was saved, but the invite could not be sent.",
        detail,
      } as const;
    default:
      return null;
  }
}

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  const data = await requireWorkspaceViewer();
  const { notice, error, detail } = await searchParams;
  const message = getClientsMessage(notice, error, detail);

  return (
    <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
      <Panel title="Add client" kicker="Invite flow">
        {message ? (
          <div
            className={`mb-4 border px-4 py-4 ${
              message.tone === "error"
                ? "border-[#b94a48] bg-[#fff1ef] text-[#7a1f1b]"
                : "border-[#a88b37] bg-[#fff8dd] text-[#6e5714]"
            }`}
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.22em]">Client status</p>
            <p className="mt-2 text-sm font-semibold">{message.title}</p>
            <p className="mt-2 text-sm leading-6">{message.body}</p>
            {message.detail ? (
              <p className="mt-3 border-t border-current/20 pt-3 text-sm leading-6">
                Detail: {message.detail}
              </p>
            ) : null}
          </div>
        ) : null}
        <form action={createClientAction} className="space-y-3">
          <input
            name="name"
            type="text"
            placeholder="Client name"
            className="w-full border border-line bg-canvas px-4 py-3 text-sm outline-none focus:border-ink"
            required
          />
          <input
            name="email"
            type="email"
            placeholder="Client email"
            className="w-full border border-line bg-canvas px-4 py-3 text-sm outline-none focus:border-ink"
            required
          />
          <input
            name="companyName"
            type="text"
            placeholder="Company"
            className="w-full border border-line bg-canvas px-4 py-3 text-sm outline-none focus:border-ink"
          />
          <textarea
            name="notes"
            placeholder="Notes"
            className="min-h-28 w-full border border-line bg-canvas px-4 py-3 text-sm outline-none focus:border-ink"
          />
          <label className="flex items-center gap-3 border border-line bg-canvas px-4 py-3 text-sm text-muted">
            <input type="checkbox" name="inviteNow" />
            Send portal invite now
          </label>
          <button className="button-primary w-full border px-4 py-3 text-sm font-medium uppercase tracking-[0.18em]">
            Save client
          </button>
        </form>
      </Panel>
      <Panel title="Client roster" kicker="RLS-protected">
        <div className="space-y-3">
          {data.clients.length ? (
            data.clients.map((client) => (
              <div key={client.id} className="border border-line bg-canvas p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-ink">{client.name}</h3>
                    <p className="mt-1 text-sm text-muted">
                      {client.companyName ?? "Independent client"} · {client.email}
                    </p>
                  </div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
                    {titleCase(client.status)}
                  </p>
                </div>
                {client.notes ? <p className="mt-3 text-sm leading-6 text-muted">{client.notes}</p> : null}
                <p className="mt-3 text-xs uppercase tracking-[0.22em] text-muted">
                  Invited {formatDate(client.invitedAt)}
                </p>
              </div>
            ))
          ) : (
            <EmptyState
              title="No client records"
              body="Add your first client here, then connect that client to one or more projects in the workspace."
            />
          )}
        </div>
      </Panel>
    </div>
  );
}
