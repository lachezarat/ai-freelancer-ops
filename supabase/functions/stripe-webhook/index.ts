import Stripe from "https://esm.sh/stripe@20.4.1?target=deno";
import { handleCors } from "../_shared/cors.ts";
import { requiredEnv } from "../_shared/env.ts";
import { jsonResponse } from "../_shared/json.ts";
import { getPlanCodeForPrice, getStripeClient } from "../_shared/stripe.ts";
import { getServiceSupabaseClient } from "../_shared/supabase.ts";

function toTimestamp(value?: number | null) {
  return value ? new Date(value * 1000).toISOString() : null;
}

async function resolveWorkspaceId(serviceClient: ReturnType<typeof getServiceSupabaseClient>, customerId?: string | Stripe.Customer | Stripe.DeletedCustomer | null, metadata?: Record<string, string>) {
  if (metadata?.workspace_id) {
    return metadata.workspace_id;
  }

  if (typeof customerId !== "string") {
    return null;
  }

  const { data } = await serviceClient
    .from("stripe_customers")
    .select("workspace_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  return data?.workspace_id ?? null;
}

Deno.serve(async (request) => {
  const corsResponse = handleCors(request);

  if (corsResponse) {
    return corsResponse;
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return jsonResponse({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  try {
    const payload = await request.text();
    const stripe = getStripeClient();
    const cryptoProvider = Stripe.createSubtleCryptoProvider();
    const event = await stripe.webhooks.constructEventAsync(
      payload,
      signature,
      requiredEnv("STRIPE_WEBHOOK_SECRET"),
      undefined,
      cryptoProvider,
    );
    const serviceClient = getServiceSupabaseClient();

    const { data: existingEvent } = await serviceClient
      .from("stripe_events")
      .select("id")
      .eq("event_id", event.id)
      .maybeSingle();

    if (existingEvent) {
      return jsonResponse({ received: true, duplicate: true });
    }

    let status = "processed";

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const subscription = event.data.object as Stripe.Subscription;
      const planCode =
        getPlanCodeForPrice(subscription.items.data[0]?.price.id) ??
        ((subscription.metadata?.plan_code as "pro" | "studio" | undefined) ?? "pro");
      const workspaceId = await resolveWorkspaceId(serviceClient, subscription.customer, subscription.metadata);

      if (workspaceId) {
        const customerId =
          typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;

        await serviceClient.from("subscriptions").upsert({
          workspace_id: workspaceId,
          plan_code: planCode,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          stripe_price_id: subscription.items.data[0]?.price.id ?? null,
          status: event.type === "customer.subscription.deleted" ? "canceled" : subscription.status,
          cancel_at_period_end: subscription.cancel_at_period_end,
          current_period_start: toTimestamp(subscription.items.data[0]?.current_period_start ?? subscription.current_period_start),
          current_period_end: toTimestamp(subscription.items.data[0]?.current_period_end ?? subscription.current_period_end),
          trial_end: toTimestamp(subscription.trial_end),
          last_event_at: new Date(event.created * 1000).toISOString(),
          metadata: subscription.metadata ?? {},
        });
      } else {
        status = "ignored";
      }
    } else if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const workspaceId = session.metadata?.workspace_id ?? null;

      if (workspaceId && typeof session.customer === "string") {
        await serviceClient.from("stripe_customers").upsert({
          workspace_id: workspaceId,
          stripe_customer_id: session.customer,
        });
      } else {
        status = "ignored";
      }
    } else if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : null;

      if (subscriptionId) {
        await serviceClient
          .from("subscriptions")
          .update({
            status: "past_due",
            last_event_at: new Date(event.created * 1000).toISOString(),
          })
          .eq("stripe_subscription_id", subscriptionId);
      } else {
        status = "ignored";
      }
    } else {
      status = "ignored";
    }

    await serviceClient.from("stripe_events").insert({
      event_id: event.id,
      event_type: event.type,
      livemode: event.livemode,
      status,
      payload: event,
      processed_at: new Date().toISOString(),
    });

    return jsonResponse({ received: true, status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ error: message }, { status: 400 });
  }
});
