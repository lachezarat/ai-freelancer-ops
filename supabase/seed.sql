do $$
declare
  admin_user_id constant uuid := '11111111-1111-4111-8111-111111111111';
  freelancer_user_id constant uuid := '22222222-2222-4222-8222-222222222222';
  client_user_a_id constant uuid := '33333333-3333-4333-8333-333333333333';
  client_user_b_id constant uuid := '44444444-4444-4444-8444-444444444444';
  workspace_id uuid;
  client_a_id uuid := '55555555-5555-4555-8555-555555555555';
  client_b_id uuid := '66666666-6666-4666-8666-666666666666';
  project_a_id uuid := '77777777-7777-4777-8777-777777777777';
  project_b_id uuid := '88888888-8888-4888-8888-888888888888';
  milestone_a_id uuid := '99999999-9999-4999-8999-999999999999';
  milestone_b_id uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  deliverable_a_id uuid := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  deliverable_b_id uuid := 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  session_a_id uuid := 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  run_a_id uuid := 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
begin
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    email_change_token_current,
    email_change_confirm_status,
    confirmed_at,
    is_sso_user,
    deleted_at,
    is_anonymous
  )
  values
    (
      '00000000-0000-0000-0000-000000000000',
      admin_user_id,
      'authenticated',
      'authenticated',
      'admin@aifo.local',
      crypt('Passw0rd!', gen_salt('bf')),
      timezone('utc', now()),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"AIFO Admin","platform_role":"admin"}'::jsonb,
      timezone('utc', now()),
      timezone('utc', now()),
      '',
      '',
      '',
      '',
      '',
      0,
      timezone('utc', now()),
      false,
      null,
      false
    ),
    (
      '00000000-0000-0000-0000-000000000000',
      freelancer_user_id,
      'authenticated',
      'authenticated',
      'maya@aifo.local',
      crypt('Passw0rd!', gen_salt('bf')),
      timezone('utc', now()),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Maya Nguyen","platform_role":"freelancer","workspace_name":"Maya Studio","workspace_slug":"maya-studio"}'::jsonb,
      timezone('utc', now()),
      timezone('utc', now()),
      '',
      '',
      '',
      '',
      '',
      0,
      timezone('utc', now()),
      false,
      null,
      false
    ),
    (
      '00000000-0000-0000-0000-000000000000',
      client_user_a_id,
      'authenticated',
      'authenticated',
      'olivia@northstar.local',
      crypt('Passw0rd!', gen_salt('bf')),
      timezone('utc', now()),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Olivia Hart","platform_role":"client"}'::jsonb,
      timezone('utc', now()),
      timezone('utc', now()),
      '',
      '',
      '',
      '',
      '',
      0,
      timezone('utc', now()),
      false,
      null,
      false
    ),
    (
      '00000000-0000-0000-0000-000000000000',
      client_user_b_id,
      'authenticated',
      'authenticated',
      'noah@flux.local',
      crypt('Passw0rd!', gen_salt('bf')),
      timezone('utc', now()),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Noah Patel","platform_role":"client"}'::jsonb,
      timezone('utc', now()),
      timezone('utc', now()),
      '',
      '',
      '',
      '',
      '',
      0,
      timezone('utc', now()),
      false,
      null,
      false
    )
  on conflict (id) do nothing;

  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values
    (
      gen_random_uuid(),
      admin_user_id,
      format('{"sub":"%s","email":"%s"}', admin_user_id, 'admin@aifo.local')::jsonb,
      'email',
      'admin@aifo.local',
      timezone('utc', now()),
      timezone('utc', now()),
      timezone('utc', now())
    ),
    (
      gen_random_uuid(),
      freelancer_user_id,
      format('{"sub":"%s","email":"%s"}', freelancer_user_id, 'maya@aifo.local')::jsonb,
      'email',
      'maya@aifo.local',
      timezone('utc', now()),
      timezone('utc', now()),
      timezone('utc', now())
    ),
    (
      gen_random_uuid(),
      client_user_a_id,
      format('{"sub":"%s","email":"%s"}', client_user_a_id, 'olivia@northstar.local')::jsonb,
      'email',
      'olivia@northstar.local',
      timezone('utc', now()),
      timezone('utc', now()),
      timezone('utc', now())
    ),
    (
      gen_random_uuid(),
      client_user_b_id,
      format('{"sub":"%s","email":"%s"}', client_user_b_id, 'noah@flux.local')::jsonb,
      'email',
      'noah@flux.local',
      timezone('utc', now()),
      timezone('utc', now()),
      timezone('utc', now())
    )
  on conflict (provider_id, provider) do nothing;

  select id
  into workspace_id
  from public.workspaces
  where owner_user_id = freelancer_user_id
  limit 1;

  insert into public.clients (
    id,
    workspace_id,
    portal_user_id,
    email,
    name,
    company_name,
    notes,
    status,
    invited_at,
    created_by
  )
  values
    (
      client_a_id,
      workspace_id,
      client_user_a_id,
      'olivia@northstar.local',
      'Olivia Hart',
      'Northstar Labs',
      'Primary stakeholder for the proposal workflow.',
      'active',
      timezone('utc', now()) - interval '4 days',
      freelancer_user_id
    ),
    (
      client_b_id,
      workspace_id,
      client_user_b_id,
      'noah@flux.local',
      'Noah Patel',
      'Flux Commerce',
      'Needs weekly portal reviews and copy checkpoints.',
      'active',
      timezone('utc', now()) - interval '3 days',
      freelancer_user_id
    )
  on conflict (id) do nothing;

  insert into public.projects (
    id,
    workspace_id,
    created_by,
    title,
    description,
    status,
    starts_on,
    due_on
  )
  values
    (
      project_a_id,
      workspace_id,
      freelancer_user_id,
      'Northstar Launch Support',
      'A proposal-to-delivery workflow for Northstar product launch assets.',
      'active',
      current_date - 10,
      current_date + 14
    ),
    (
      project_b_id,
      workspace_id,
      freelancer_user_id,
      'Flux Commerce Messaging Sprint',
      'Messaging system refresh with weekly client approvals.',
      'paused',
      current_date - 21,
      current_date + 21
    )
  on conflict (id) do nothing;

  insert into public.project_clients (project_id, client_id, access_role, added_by)
  values
    (project_a_id, client_a_id, 'primary', freelancer_user_id),
    (project_b_id, client_b_id, 'primary', freelancer_user_id)
  on conflict (project_id, client_id) do nothing;

  insert into public.milestones (
    id,
    project_id,
    created_by,
    title,
    description,
    position,
    due_at,
    status,
    submitted_at
  )
  values
    (
      milestone_a_id,
      project_a_id,
      freelancer_user_id,
      'Proposal and timeline',
      'Draft proposal and align on budget guardrails.',
      1,
      timezone('utc', now()) + interval '5 days',
      'in_review',
      timezone('utc', now()) - interval '1 day'
    ),
    (
      milestone_b_id,
      project_b_id,
      freelancer_user_id,
      'Message system outline',
      'Approve the new headline and CTA structure.',
      1,
      timezone('utc', now()) + interval '8 days',
      'in_progress',
      null
    )
  on conflict (id) do nothing;

  insert into public.deliverables (
    id,
    project_id,
    milestone_id,
    created_by,
    title,
    description,
    body,
    status,
    submitted_at
  )
  values
    (
      deliverable_a_id,
      project_a_id,
      milestone_a_id,
      freelancer_user_id,
      'Launch proposal draft',
      'Narrative scope, phased timeline, and budget tiers.',
      '## Proposal draft\n\n- Scope alignment workshop\n- Message system\n- Delivery checklist',
      'submitted',
      timezone('utc', now()) - interval '18 hours'
    ),
    (
      deliverable_b_id,
      project_b_id,
      milestone_b_id,
      freelancer_user_id,
      'Message outline',
      'Headline architecture and CTA system.',
      '## Outline\n\n- Hero message\n- Supporting proof blocks\n- CTA variations',
      'draft',
      null
    )
  on conflict (id) do nothing;

  insert into public.comments (
    project_id,
    milestone_id,
    deliverable_id,
    author_user_id,
    body
  )
  values
    (
      project_a_id,
      milestone_a_id,
      deliverable_a_id,
      client_user_a_id,
      'Please tighten the budget framing around the kickoff week.'
    ),
    (
      project_b_id,
      milestone_b_id,
      deliverable_b_id,
      freelancer_user_id,
      'Waiting on approval before turning this into the full delivery checklist.'
    );

  insert into public.stripe_customers (workspace_id, stripe_customer_id)
  values (workspace_id, 'cus_test_maya_studio')
  on conflict (workspace_id) do nothing;

  insert into public.subscriptions (
    workspace_id,
    plan_code,
    stripe_customer_id,
    stripe_subscription_id,
    stripe_price_id,
    status,
    cancel_at_period_end,
    current_period_start,
    current_period_end,
    last_event_at,
    metadata
  )
  values (
    workspace_id,
    'pro',
    'cus_test_maya_studio',
    'sub_test_maya_pro',
    'price_pro_monthly_demo',
    'active',
    false,
    timezone('utc', now()) - interval '10 days',
    timezone('utc', now()) + interval '20 days',
    timezone('utc', now()) - interval '1 hour',
    '{"source":"seed"}'::jsonb
  )
  on conflict (workspace_id) do update
  set plan_code = excluded.plan_code,
      stripe_customer_id = excluded.stripe_customer_id,
      stripe_subscription_id = excluded.stripe_subscription_id,
      stripe_price_id = excluded.stripe_price_id,
      status = excluded.status,
      cancel_at_period_end = excluded.cancel_at_period_end,
      current_period_start = excluded.current_period_start,
      current_period_end = excluded.current_period_end,
      last_event_at = excluded.last_event_at,
      metadata = excluded.metadata;

  insert into public.stripe_events (event_id, event_type, livemode, status, payload, processed_at)
  values (
    'evt_seed_subscription_active',
    'customer.subscription.created',
    false,
    'processed',
    '{"subscription_id":"sub_test_maya_pro"}'::jsonb,
    timezone('utc', now()) - interval '1 hour'
  )
  on conflict (event_id) do nothing;

  insert into public.tool_sessions (
    id,
    workspace_id,
    owner_user_id,
    tool_type,
    title,
    latest_status,
    input_preview,
    last_run_at
  )
  values (
    session_a_id,
    workspace_id,
    freelancer_user_id,
    'proposal_generator',
    'Northstar proposal',
    'succeeded',
    'Launch proposal for Northstar Labs',
    timezone('utc', now()) - interval '2 hours'
  )
  on conflict (id) do nothing;

  insert into public.tool_runs (
    id,
    session_id,
    workspace_id,
    owner_user_id,
    tool_type,
    status,
    premium_mode,
    input,
    output,
    provider,
    model,
    usage_input_tokens,
    usage_output_tokens,
    created_at,
    completed_at
  )
  values (
    run_a_id,
    session_a_id,
    workspace_id,
    freelancer_user_id,
    'proposal_generator',
    'succeeded',
    false,
    '{"projectType":"Launch support","clientGoals":"Clear scope and fast approvals","timeline":"3 weeks","budgetRange":"$6k-$9k"}'::jsonb,
    '{"summary":"Structured proposal with scope, pricing bands, risks, and delivery schedule."}'::jsonb,
    'gemini',
    'gemini-2.0-flash',
    980,
    512,
    timezone('utc', now()) - interval '2 hours',
    timezone('utc', now()) - interval '119 minutes'
  )
  on conflict (id) do nothing;
end;
$$;
