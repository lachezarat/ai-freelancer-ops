import Stripe from "https://esm.sh/stripe@20.4.1?target=deno";
import { requiredEnv } from "./env.ts";

export type SupportedPlanCode = "pro" | "studio";

export function getStripeClient() {
  return new Stripe(requiredEnv("STRIPE_SECRET_KEY"), {
    apiVersion: "2025-02-24.acacia",
    httpClient: Stripe.createFetchHttpClient(),
  });
}

export function getPriceIdForPlan(planCode: SupportedPlanCode) {
  if (planCode === "pro") {
    return requiredEnv("STRIPE_PRICE_PRO");
  }

  if (planCode === "studio") {
    return requiredEnv("STRIPE_PRICE_STUDIO");
  }

  throw new Error(`Unsupported plan: ${planCode}`);
}

export function getPlanCodeForPrice(priceId?: string | null): SupportedPlanCode | null {
  if (!priceId) {
    return null;
  }

  if (priceId === Deno.env.get("STRIPE_PRICE_PRO")) {
    return "pro";
  }

  if (priceId === Deno.env.get("STRIPE_PRICE_STUDIO")) {
    return "studio";
  }

  return null;
}

export async function ensureStripeCustomer({
  workspaceId,
  workspaceName,
  email,
  serviceClient,
}: {
  workspaceId: string;
  workspaceName: string;
  email?: string | null;
  serviceClient: {
    from: ReturnType<typeof import("https://esm.sh/@supabase/supabase-js@2.99.2").createClient>["from"];
  };
}) {
  const { data: existing, error: lookupError } = await serviceClient
    .from("stripe_customers")
    .select("stripe_customer_id")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (lookupError) {
    throw lookupError;
  }

  if (existing?.stripe_customer_id) {
    return existing.stripe_customer_id;
  }

  const stripe = getStripeClient();
  const customer = await stripe.customers.create({
    email: email ?? undefined,
    name: workspaceName,
    metadata: {
      workspace_id: workspaceId,
    },
  });

  const { error: insertError } = await serviceClient.from("stripe_customers").upsert({
    workspace_id: workspaceId,
    stripe_customer_id: customer.id,
  });

  if (insertError) {
    throw insertError;
  }

  return customer.id;
}
