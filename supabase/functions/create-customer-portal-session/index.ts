import { handleCors } from "../_shared/cors.ts";
import { optionalEnv } from "../_shared/env.ts";
import { jsonResponse } from "../_shared/json.ts";
import { ensureStripeCustomer, getStripeClient } from "../_shared/stripe.ts";
import { getOwnedWorkspace, getProfile, getServiceSupabaseClient, requireUser } from "../_shared/supabase.ts";

Deno.serve(async (request) => {
  const corsResponse = handleCors(request);

  if (corsResponse) {
    return corsResponse;
  }

  try {
    const { user } = await requireUser(request);
    const serviceClient = getServiceSupabaseClient();
    const workspace = await getOwnedWorkspace(serviceClient, user.id);
    const profile = await getProfile(serviceClient, user.id);
    const customerId = await ensureStripeCustomer({
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      email: profile.email,
      serviceClient,
    });
    const stripe = getStripeClient();
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: optionalEnv("STRIPE_PORTAL_RETURN_URL") ?? "http://127.0.0.1:3000/workspace/billing",
    });

    return jsonResponse({ portalUrl: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ error: message }, { status: message === "Unauthorized" ? 401 : 500 });
  }
});
