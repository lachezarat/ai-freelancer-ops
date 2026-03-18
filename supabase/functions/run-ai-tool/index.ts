import { handleCors } from "../_shared/cors.ts";
import { optionalEnv, requiredEnv } from "../_shared/env.ts";
import { jsonResponse } from "../_shared/json.ts";
import { getOwnedWorkspace, getServiceSupabaseClient, requireUser } from "../_shared/supabase.ts";
import {
  buildSessionTitle,
  buildToolPrompt,
  extractTextFromGemini,
  safeJsonParse,
  type ToolType,
} from "../_shared/tools.ts";

type RunRequest = {
  workspaceId?: string;
  sessionId?: string;
  toolType: ToolType;
  premiumMode?: boolean;
  input: Record<string, unknown>;
};

async function callGemini(toolType: ToolType, input: Record<string, unknown>, premiumMode: boolean) {
  const apiKey = requiredEnv("GEMINI_API_KEY");
  const model =
    premiumMode
      ? optionalEnv("GEMINI_MODEL_PREMIUM") ?? "gemini-2.0-pro-exp-02-05"
      : optionalEnv("GEMINI_MODEL_DEFAULT") ?? "gemini-2.0-flash";
  const prompt = buildToolPrompt(toolType, input, premiumMode);
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: prompt.system }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: prompt.user }],
          },
        ],
        generationConfig: {
          temperature: premiumMode ? 0.75 : 0.45,
          responseMimeType: "application/json",
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini request failed with ${response.status}`);
  }

  const payload = await response.json();
  const outputText = extractTextFromGemini(payload);

  if (!outputText) {
    throw new Error("Gemini returned an empty response");
  }

  return {
    model,
    payload,
    parsedOutput: safeJsonParse(outputText) ?? { raw: outputText },
    usage: {
      inputTokens: payload.usageMetadata?.promptTokenCount ?? null,
      outputTokens: payload.usageMetadata?.candidatesTokenCount ?? null,
    },
  };
}

Deno.serve(async (request) => {
  const corsResponse = handleCors(request);

  if (corsResponse) {
    return corsResponse;
  }

  let runId: string | null = null;
  let sessionId: string | null = null;

  try {
    const { user } = await requireUser(request);
    const body = (await request.json()) as RunRequest;

    if (!body.toolType || !body.input || !["proposal_generator", "brief_analyzer", "checklist_builder"].includes(body.toolType)) {
      return jsonResponse({ error: "Invalid tool request" }, { status: 400 });
    }

    const serviceClient = getServiceSupabaseClient();
    const workspace = await getOwnedWorkspace(serviceClient, user.id, body.workspaceId);
    const { data: snapshot, error: snapshotError } = await serviceClient.rpc("workspace_access_snapshot", {
      p_workspace_id: workspace.id,
    }).single();

    if (snapshotError) {
      throw snapshotError;
    }

    if (!snapshot.ai_enabled) {
      return jsonResponse({ error: "AI tools are not enabled for this workspace" }, { status: 403 });
    }

    if (
      snapshot.monthly_ai_run_limit !== null &&
      snapshot.monthly_ai_run_count >= snapshot.monthly_ai_run_limit
    ) {
      return jsonResponse({ error: "Monthly AI usage limit reached" }, { status: 429 });
    }

    if (body.premiumMode && !snapshot.premium_ai_mode) {
      return jsonResponse({ error: "Premium AI mode requires the Studio plan" }, { status: 403 });
    }

    if (body.sessionId) {
      const { data: existingSession, error: sessionError } = await serviceClient
        .from("tool_sessions")
        .select("id")
        .eq("id", body.sessionId)
        .eq("workspace_id", workspace.id)
        .eq("owner_user_id", user.id)
        .maybeSingle();

      if (sessionError) {
        throw sessionError;
      }

      if (!existingSession) {
        throw new Error("Session not found");
      }

      sessionId = existingSession.id;
    } else {
      const { data: createdSession, error: createSessionError } = await serviceClient
        .from("tool_sessions")
        .insert({
          workspace_id: workspace.id,
          owner_user_id: user.id,
          tool_type: body.toolType,
          title: buildSessionTitle(body.toolType, body.input),
          latest_status: "running",
          input_preview: JSON.stringify(body.input).slice(0, 120),
          last_run_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (createSessionError) {
        throw createSessionError;
      }

      sessionId = createdSession.id;
    }

    const { data: createdRun, error: createRunError } = await serviceClient
      .from("tool_runs")
      .insert({
        session_id: sessionId,
        workspace_id: workspace.id,
        owner_user_id: user.id,
        tool_type: body.toolType,
        status: "running",
        premium_mode: body.premiumMode ?? false,
        input: body.input,
        provider: "gemini",
      })
      .select("id")
      .single();

    if (createRunError) {
      throw createRunError;
    }

    runId = createdRun.id;

    const result = await callGemini(body.toolType, body.input, body.premiumMode ?? false);

    await serviceClient
      .from("tool_runs")
      .update({
        status: "succeeded",
        output: result.parsedOutput,
        model: result.model,
        usage_input_tokens: result.usage.inputTokens,
        usage_output_tokens: result.usage.outputTokens,
        completed_at: new Date().toISOString(),
      })
      .eq("id", runId);

    await serviceClient
      .from("tool_sessions")
      .update({
        latest_status: "succeeded",
        last_run_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    await serviceClient.from("activity_events").insert({
      workspace_id: workspace.id,
      actor_user_id: user.id,
      event_type: "tool_runs.succeeded",
      entity_type: "tool_runs",
      entity_id: runId,
      visibility: "workspace",
      payload: {
        toolType: body.toolType,
        sessionId,
      },
    });

    return jsonResponse({
      sessionId,
      runId,
      status: "succeeded",
      output: result.parsedOutput,
      usage: result.usage,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (runId && sessionId) {
      const serviceClient = getServiceSupabaseClient();

      await serviceClient
        .from("tool_runs")
        .update({
          status: "failed",
          error_message: message,
          completed_at: new Date().toISOString(),
        })
        .eq("id", runId);

      await serviceClient
        .from("tool_sessions")
        .update({
          latest_status: "failed",
          last_run_at: new Date().toISOString(),
        })
        .eq("id", sessionId);
    }

    return jsonResponse({ error: message }, { status: message === "Unauthorized" ? 401 : 500 });
  }
});
