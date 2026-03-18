import { handleCors } from "../_shared/cors.ts";
import { jsonResponse } from "../_shared/json.ts";
import { ensureStripeCustomer, getPriceIdForPlan, type SupportedPlanCode } from "../_shared/stripe.ts";
import { getOwnedWorkspace, getProfile, getServiceSupabaseClient, requireUser } from "../_shared/supabase.ts";

function toTimestamp(value?: number | null) {
  return value ? new Date(value * 1000).toISOString() : null;
}

function hasManagedSubscription(status?: string | null) {
  return ["trialing", "active", "past_due", "unpaid"].includes(status ?? "");
}

Deno.serve(async (request) => {
  const corsResponse = handleCors(request);

  if (corsResponse) {
    return corsResponse;
  }

  try {
    const { user } = await requireUser(request);
    const { planCode, successUrl, cancelUrl } = await request.json();

    if (!planCode || !["pro", "studio"].includes(planCode)) {
      return jsonResponse({ error: "planCode must be pro or studio" }, { status: 400 });
    }

    const serviceClient = getServiceSupabaseClient();
    const workspace = await getOwnedWorkspace(serviceClient, user.id);
    const profile = await getProfile(serviceClient, user.id);
    const customerId = await ensureStripeCustomer({
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      email: profile.email,
      serviceClient,
    });
    const stripe = (await import("../_shared/stripe.ts")).getStripeClient();
    const priceId = getPriceIdForPlan(planCode as SupportedPlanCode);
    const { data: existingSubscription, error: existingSubscriptionError } = await serviceClient
      .from("subscriptions")
      .select("plan_code, status, stripe_subscription_id")
      .eq("workspace_id", workspace.id)
      .maybeSingle();

    if (existingSubscriptionError) {
      throw existingSubscriptionError;
    }

    if (
      existingSubscription?.stripe_subscription_id &&
      hasManagedSubscription(existingSubscription.status)
    ) {
      if (existingSubscription.plan_code === planCode) {
        return jsonResponse({
          changedExistingSubscription: false,
        });
      }

      const currentSubscription = await stripe.subscriptions.retrieve(
        existingSubscription.stripe_subscription_id,
      );
      const currentItem = currentSubscription.items.data[0];

      if (!currentItem) {
        throw new Error("Existing Stripe subscription has no subscription items.");
      }

      const updatedSubscription = await stripe.subscriptions.update(
        existingSubscription.stripe_subscription_id,
        {
          cancel_at_period_end: false,
          items: [
            {
              id: currentItem.id,
              price: priceId,
              quantity: currentItem.quantity ?? 1,
            },
          ],
          proration_behavior: "create_prorations",
          metadata: {
            workspace_id: workspace.id,
            plan_code: planCode,
            user_id: user.id,
          },
        },
      );

      await serviceClient.from("subscriptions").upsert({
        workspace_id: workspace.id,
        plan_code: planCode,
        stripe_customer_id: customerId,
        stripe_subscription_id: updatedSubscription.id,
        stripe_price_id: updatedSubscription.items.data[0]?.price.id ?? priceId,
        status: updatedSubscription.status,
        cancel_at_period_end: updatedSubscription.cancel_at_period_end,
        current_period_start: toTimestamp(
          updatedSubscription.items.data[0]?.current_period_start ??
            updatedSubscription.current_period_start,
        ),
        current_period_end: toTimestamp(
          updatedSubscription.items.data[0]?.current_period_end ??
            updatedSubscription.current_period_end,
        ),
        trial_end: toTimestamp(updatedSubscription.trial_end),
        last_event_at: new Date().toISOString(),
        metadata: updatedSubscription.metadata ?? {},
      });

      return jsonResponse({
        changedExistingSubscription: true,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: workspace.id,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      metadata: {
        workspace_id: workspace.id,
        plan_code: planCode,
        user_id: user.id,
      },
      subscription_data: {
        metadata: {
          workspace_id: workspace.id,
          plan_code: planCode,
          user_id: user.id,
        },
      },
    });

    return jsonResponse({
      checkoutUrl: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ error: message }, { status: message === "Unauthorized" ? 401 : 500 });
  }
});
