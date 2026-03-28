import type { AgentDecision, SupportedAiProvider } from "../types.js";
import { routeAction } from "./action-router.js";

export class DecisionEngine {
  decide(input: { command: string; url?: string; provider?: SupportedAiProvider | undefined }): AgentDecision {
    return routeAction(input.command, {
      url: input.url,
      provider: input.provider
    }).decision;
  }
}
