# Short Application Version For BAM

---

I shipped a project called **AI Freelancer Ops**, a backend-first SaaS case study built on **Supabase + Stripe + Vercel**.

The reason it’s relevant to BAM is that it combines the exact backend concerns you called out:

- **Supabase RLS on a multi-role app**: the app supports freelancer, client, admin, and guest contexts on a shared Supabase backend, with access scoped through the relational model instead of relying on frontend checks.
- **Stripe lifecycle end-to-end**: I implemented server-triggered checkout, customer portal handoff, and webhook-driven subscription sync so plan state and entitlements are updated from backend truth.
- **Edge Functions for trusted workflows**: Stripe orchestration and AI-provider calls sit behind Supabase Edge Functions, so secrets never live in the browser.
- **Shared auth + feature gating**: auth, billing state, and entitlements all feed into what each surface can access.
- **Realtime support**: the same backend also pushes live activity updates through Supabase Realtime.

Live demo: https://ai-freelancer-ops.vercel.app  
Repo: https://github.com/lachezarat/ai-freelancer-ops

What I think maps most directly to BAM:

- your shared Supabase instance across Coaches, Virtual Academy, and tools
- Stripe checkout + webhooks + subscription gating
- API key migration behind serverless functions
- unified auth hub
- add-on tool persistence and realtime state

If I were stepping into BAM first, I’d start by validating the schema + roles, then lock down the Stripe subscription lifecycle, then move any remaining key-bearing integrations behind Edge Functions and run a full RLS / entitlement QA pass.

---

This is the strongest proof point I’d lead with for the BAM role because it shows the exact combination of RLS, webhook-driven billing truth, Edge Function trust boundaries, and shared-backend architecture you described.
