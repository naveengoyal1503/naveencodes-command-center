import { BrowserService } from "./browser-service.js";
import { LogService } from "./log-service.js";
import { DecisionEngine } from "../intelligence/decision-engine.js";
import { CommandInterpreter } from "../intelligence/command-interpreter.js";
import { IntelligenceAiClient } from "../intelligence/ai-client.js";
import type { SupportedAiProvider } from "../types.js";

export class AutonomousAgentService {
  constructor(
    private readonly browserService = new BrowserService(),
    private readonly decisionEngine = new DecisionEngine(),
    private readonly commandInterpreter = new CommandInterpreter(),
    private readonly aiClient = new IntelligenceAiClient(),
    private readonly logService = new LogService()
  ) {}

  async run(input: {
    userId: string;
    command: string;
    url?: string;
    provider?: SupportedAiProvider;
    maxIterations?: number;
    includeAiSummary?: boolean;
  }) {
    const decision = this.decisionEngine.decide({
      command: input.command,
      url: input.url,
      provider: input.provider
    });

    await this.logService.logCommand({
      userId: input.userId,
      command: input.command,
      route: decision.route,
      intent: decision.intent
    });

    const iterations: Array<Record<string, unknown>> = [];
    const maxIterations = Math.max(1, Math.min(input.maxIterations ?? 2, 5));
    let latestAiSummary: Record<string, unknown> | null = null;

    for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
      const actions = decision.useBrowser ? this.commandInterpreter.toActions(input.command, decision) : [];
      const execution = actions.length ? await this.browserService.execute(actions) : null;
      const issues = [
        ...(execution?.errors ?? []),
        ...(execution?.consoleLogs.filter((entry) => entry.type === "error").map((entry) => entry.message) ?? []),
        ...(execution?.networkLogs.filter((entry) => entry.type === "failure").map((entry) => entry.details ?? entry.url) ?? [])
      ].filter(Boolean);

      if ((input.includeAiSummary || issues.length > 0) && decision.useAi) {
        latestAiSummary = await this.aiClient.runForUser({
          userId: input.userId,
          provider: input.provider,
          systemPrompt: "You are an autonomous AI developer agent. Analyze the run and propose the next best action.",
          message: this.commandInterpreter.toAiPrompt(input.command, decision, issues)
        });
      }

      const phase = issues.length ? ["analyze", "fix", "re-test"] : ["analyze"];
      iterations.push({
        iteration,
        phase,
        actions,
        execution,
        issues,
        aiSummary: latestAiSummary
      });

      await this.logService.logExecution({
        userId: input.userId,
        iteration,
        route: decision.route,
        issues,
        success: execution?.success ?? true
      });

      if (!decision.autoLoop || issues.length === 0) {
        break;
      }
    }

    return {
      decision,
      iterations,
      aiSummary: latestAiSummary
    };
  }
}
