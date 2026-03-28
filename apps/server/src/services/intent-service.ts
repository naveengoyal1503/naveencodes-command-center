import type { AgentIntent } from "../types.js";

const keywords: Record<AgentIntent, string[]> = {
  open: ["open", "visit", "launch", "go to"],
  build: ["build", "create", "generate", "scaffold", "develop"],
  analyze: ["analyze", "inspect", "audit", "review", "check"],
  fix: ["fix", "debug", "repair", "resolve", "broken", "error"],
  test: ["test", "verify", "simulate", "qa", "checkout", "login"]
};

export class IntentService {
  classify(command: string) {
    const normalized = command.toLowerCase().trim();
    const scores = Object.entries(keywords).map(([intent, terms]) => ({
      intent: intent as AgentIntent,
      score: terms.reduce((sum, term) => sum + Number(normalized.includes(term)), 0)
    }));

    const leadIntent = scores.find(({ intent }) => keywords[intent].some((term) => normalized.startsWith(term)))?.intent;
    scores.sort((left, right) => right.score - left.score);
    const primary = leadIntent ?? scores[0]?.intent ?? "analyze";
    const secondary = scores.filter((item) => item.intent !== primary && item.score > 0).map((item) => item.intent);

    return {
      primary,
      secondary,
      confidence: Math.min(0.55 + (scores[0]?.score ?? 0) * 0.15, 0.95),
      extractedUrl: normalized.match(/https?:\/\/[^\s]+/i)?.[0] ?? null
    };
  }
}
