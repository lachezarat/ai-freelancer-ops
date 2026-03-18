export type ToolType =
  | "proposal_generator"
  | "brief_analyzer"
  | "checklist_builder";

export function buildSessionTitle(toolType: ToolType, input: Record<string, unknown>) {
  const titleSeed = String(
    input.projectType ??
      input.projectName ??
      input.clientGoals ??
      input.deadline ??
      input.brief ??
      "Untitled session",
  )
    .replace(/\s+/g, " ")
    .trim();

  if (toolType === "proposal_generator") {
    return `Proposal: ${titleSeed.slice(0, 48)}`;
  }

  if (toolType === "brief_analyzer") {
    return `Brief: ${titleSeed.slice(0, 52)}`;
  }

  return `Checklist: ${titleSeed.slice(0, 46)}`;
}

export function buildToolPrompt(toolType: ToolType, input: Record<string, unknown>, premiumMode: boolean) {
  const serializedInput = JSON.stringify(input, null, 2);
  const premiumLine = premiumMode
    ? "The user is on Studio. Include stronger structure, sharper risk framing, and more polished output."
    : "Keep the output practical and concise.";

  if (toolType === "proposal_generator") {
    return {
      system:
        "You are an operations-focused freelance strategist. Return only valid JSON with keys: title, executiveSummary, scope, timeline, budgetBands, risks, nextSteps.",
      user: `${premiumLine}\nCreate a proposal draft from this input:\n${serializedInput}`,
    };
  }

  if (toolType === "brief_analyzer") {
    return {
      system:
        "You are an expert delivery strategist. Return only valid JSON with keys: summary, missingRequirements, riskAreas, recommendedQuestions, deliveryAssumptions.",
      user: `${premiumLine}\nAnalyze this client brief input:\n${serializedInput}`,
    };
  }

  return {
    system:
      "You are a delivery operations assistant. Return only valid JSON with keys: overview, milestones, deliveryChecklist, approvalChecklist.",
    user: `${premiumLine}\nGenerate a delivery checklist from this input:\n${serializedInput}`,
  };
}

export function extractTextFromGemini(payload: Record<string, unknown>) {
  const candidates = Array.isArray(payload.candidates) ? payload.candidates : [];
  const firstCandidate = candidates[0] as
    | {
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }
    | undefined;

  const parts = firstCandidate?.content?.parts ?? [];
  return parts
    .map((part) => part.text ?? "")
    .join("\n")
    .trim();
}

export function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
