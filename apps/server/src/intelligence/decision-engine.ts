import type { AgentDecision, SupportedAiProvider } from "../types.js";
import { IntentService } from "../services/intent-service.js";

export class DecisionEngine {
  constructor(private readonly intentService = new IntentService()) {}

  decide(input: { command: string; url?: string; provider?: SupportedAiProvider | undefined }): AgentDecision {
    const intentResult = this.intentService.classify(input.command);
    const route =
      intentResult.primary === "build"
        ? "projects"
        : input.url || intentResult.extractedUrl
          ? "actions"
          : intentResult.primary === "analyze"
            ? "analyze"
            : "chat";

    return {
      intent: intentResult.primary,
      secondaryIntents: intentResult.secondary,
      confidence: intentResult.confidence,
      route,
      useBrowser: Boolean(input.url || intentResult.extractedUrl || intentResult.primary === "test" || intentResult.primary === "fix"),
      useAi: Boolean(input.provider || intentResult.primary !== "analyze"),
      autoLoop: intentResult.primary === "fix" || intentResult.primary === "test",
      targetUrl: input.url ?? intentResult.extractedUrl
    };
  }
}
