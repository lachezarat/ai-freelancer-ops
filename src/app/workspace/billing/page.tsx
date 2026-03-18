import { openBillingPortalAction, startCheckoutAction } from "@/app/actions";
import { Panel } from "@/components/ui/panel";
import { StatCard } from "@/components/ui/stat-card";
import { requireWorkspaceViewer } from "@/lib/data/app-data";
import { formatDate, titleCase } from "@/lib/utils";

const plans = [
  {
    code: "pro",
    name: "Pro",
    summary: "Unlimited clients and projects, AI access, client portal, realtime feed.",
  },
  {
    code: "studio",
    name: "Studio",
    summary: "Higher AI quotas, premium generation mode, same shared backend contract.",
  },
];

type BillingPageProps = {
  searchParams: Promise<{
    notice?: string;
    checkout?: string;
  }>;
};

function getBillingNotice(notice?: string, checkout?: string) {
  if (notice === "subscription_updated") {
    return {
      title: "Studio upgrade applied",
      body: "The workspace subscription was updated directly in Stripe. Billing details and entitlements should now reflect the Studio plan.",
    } as const;
  }

  if (notice === "already_on_plan") {
    return {
      title: "Already on this plan",
      body: "This workspace is already subscribed to the selected plan.",
    } as const;
  }

  if (notice === "manage_subscription_in_portal") {
    return {
      title: "Manage changes in the customer portal",
      body: "This workspace already has a paid Stripe subscription. Use the customer portal for downgrades, cancellations, or payment-method changes.",
    } as const;
  }

  if (checkout === "success") {
    return {
      title: "Checkout complete",
      body: "Stripe returned successfully. If the plan badge still looks stale, refresh once while the webhook finishes syncing.",
    } as const;
  }

  if (checkout === "cancelled") {
    return {
      title: "Checkout cancelled",
      body: "No billing change was made.",
    } as const;
  }

  return null;
}

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const data = await requireWorkspaceViewer();
  const { notice, checkout } = await searchParams;
  const billingNotice = getBillingNotice(notice, checkout);
  const hasManagedSubscription =
    data.subscription.planCode !== "free" &&
    !["inactive", "canceled"].includes(data.subscription.status);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Current plan"
          value={titleCase(data.subscription.planCode)}
          detail={`Status: ${data.subscription.status}`}
        />
        <StatCard
          label="Billing period end"
          value={formatDate(data.subscription.currentPeriodEnd)}
          detail={data.subscription.cancelAtPeriodEnd ? "Scheduled to cancel" : "Auto-renew enabled"}
          accent="ink"
        />
        <StatCard
          label="Realtime"
          value={data.accessSnapshot.realtimeEnabled ? "On" : "Off"}
          detail="Driven by subscription entitlement checks in SQL and Edge Functions."
          accent="success"
        />
      </section>

      <Panel title="Plan upgrade paths" kicker="Stripe checkout">
        {billingNotice ? (
          <div className="mb-4 border border-[#a88b37] bg-[#fff8dd] px-4 py-4 text-[#6e5714]">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em]">Billing notice</p>
            <p className="mt-2 text-sm font-semibold">{billingNotice.title}</p>
            <p className="mt-2 text-sm leading-6">{billingNotice.body}</p>
          </div>
        ) : null}
        <div className="grid gap-4 lg:grid-cols-2">
          {plans.map((plan) => (
            <form key={plan.code} action={startCheckoutAction} className="border border-line bg-canvas p-5">
              <input type="hidden" name="planCode" value={plan.code} />
              <h3 className="text-2xl font-semibold tracking-tight text-ink">{plan.name}</h3>
              <p className="mt-3 text-sm leading-7 text-muted">{plan.summary}</p>
              {hasManagedSubscription && data.subscription.planCode === plan.code ? (
                <div className="mt-6 space-y-3">
                  <p className="text-xs uppercase tracking-[0.22em] text-muted">
                    Current subscription
                  </p>
                  <button
                    type="button"
                    disabled
                    className="button-disabled w-full border px-4 py-3 text-sm font-medium uppercase tracking-[0.18em]"
                  >
                    Current plan
                  </button>
                </div>
              ) : hasManagedSubscription &&
                data.subscription.planCode === "pro" &&
                plan.code === "studio" ? (
                <div className="mt-6 space-y-3">
                  <p className="text-xs uppercase tracking-[0.22em] text-muted">
                    Direct upgrade from your current Pro subscription
                  </p>
                  <button className="button-accent w-full border px-4 py-3 text-sm font-medium uppercase tracking-[0.18em]">
                    Upgrade to Studio
                  </button>
                </div>
              ) : (
                <div className="mt-6 space-y-3">
                  {hasManagedSubscription ? (
                    <>
                      <p className="text-xs uppercase tracking-[0.22em] text-muted">
                        Manage this change in the customer portal
                      </p>
                      <button
                        type="button"
                        disabled
                        className="button-disabled w-full border px-4 py-3 text-sm font-medium uppercase tracking-[0.18em]"
                      >
                        Use customer portal
                      </button>
                    </>
                  ) : (
                    <button className="button-primary w-full border px-4 py-3 text-sm font-medium uppercase tracking-[0.18em]">
                      Start Stripe checkout
                    </button>
                  )}
                </div>
              )}
            </form>
          ))}
        </div>
      </Panel>

      <Panel title="Customer portal" kicker="Lifecycle management">
        <p className="max-w-2xl text-sm leading-7 text-muted">
          Use the Stripe customer portal for billing-method updates, subscription cancellations, and
          downgrade flows. Webhooks keep the database subscription state synchronized with Stripe truth.
        </p>
        <form action={openBillingPortalAction} className="mt-6">
          <button className="button-secondary border px-4 py-3 text-sm font-medium uppercase tracking-[0.18em]">
            Open customer portal
          </button>
        </form>
      </Panel>
    </div>
  );
}
