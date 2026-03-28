import { BrowserService } from "./browser-service.js";
import { LogService } from "./log-service.js";
import { DecisionEngine } from "../intelligence/decision-engine.js";
import { CommandInterpreter } from "../intelligence/command-interpreter.js";
import { IntelligenceAiClient } from "../intelligence/ai-client.js";
import type { ProjectRecord, SupportedAiProvider } from "../types.js";
import { parseCommand } from "../intelligence/command-parser.js";
import { routeAction } from "../intelligence/action-router.js";
import { ProjectService } from "./project-service.js";
import { WorkspaceManager } from "./workspace-manager.js";

export class AutonomousAgentService {
  constructor(
    private readonly browserService = new BrowserService(),
    private readonly decisionEngine = new DecisionEngine(),
    private readonly commandInterpreter = new CommandInterpreter(),
    private readonly aiClient = new IntelligenceAiClient(),
    private readonly logService = new LogService(),
    private readonly projectService = new ProjectService(),
    private readonly workspaceManager = new WorkspaceManager()
  ) {}

  async run(input: {
    userId: string;
    command: string;
    url?: string;
    provider?: SupportedAiProvider;
    maxIterations?: number;
    includeAiSummary?: boolean;
    workspacePath?: string;
    confirmWorkspace?: boolean;
  }) {
    const parsedCommand = parseCommand(input.url ? `${input.command} ${input.url}` : input.command);
    const routedAction = routeAction(input.command, {
      url: input.url ?? parsedCommand.url ?? undefined,
      provider: input.provider
    });
    const decision = this.decisionEngine.decide({
      command: input.command,
      url: routedAction.parsed.url ?? undefined,
      provider: input.provider
    });

    await this.logService.logCommand({
      userId: input.userId,
      command: input.command,
      route: decision.route,
      intent: decision.intent,
      parsedUrl: routedAction.parsed.url,
      responseStrategy: routedAction.responseStrategy
    });

    const iterations: Array<Record<string, unknown>> = [];
    const maxIterations = Math.max(1, Math.min(input.maxIterations ?? 2, 5));
    let latestAiSummary: Record<string, unknown> | null = null;
    let projectResult: ProjectRecord | null = null;
    let workspaceResolution = await this.workspaceManager.resolveWorkspace({
      userId: input.userId,
      requestedPath: input.workspacePath,
      requireWorkspace: decision.route === "projects" || (decision.intent === "fix" && !decision.targetUrl),
      confirmWorkspace: input.confirmWorkspace
    });

    if (workspaceResolution.requiresWorkspace || workspaceResolution.requiresConfirmation) {
      return {
        parsedCommand,
        routedAction,
        decision,
        workspace: workspaceResolution,
        projectResult: null,
        iterations: [],
        aiSummary: workspaceResolution.message
          ? { provider: "system", text: workspaceResolution.message }
          : null
      };
    }

    if (decision.route === "projects") {
      projectResult = await this.projectService.create({
        ownerId: input.userId,
        name: this.buildProjectName(input.command),
        prompt: input.command,
        type: this.detectProjectType(input.command),
        framework: input.command.toLowerCase().includes("react") ? "react" : "vanilla",
        workspacePath: workspaceResolution.workspacePath!
      });
    }

    for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
      const actions = decision.useBrowser ? this.commandInterpreter.toActions(input.command, decision) : [];
      const execution = actions.length ? await this.browserService.execute(actions) : null;
      const workspaceScan =
        workspaceResolution.workspacePath && (!decision.targetUrl || decision.intent === "fix" || decision.intent === "analyze")
          ? await this.workspaceManager.scanWorkspace(workspaceResolution.workspacePath)
          : null;
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

      if (!decision.useBrowser && decision.useAi && !latestAiSummary) {
        latestAiSummary = await this.aiClient.runForUser({
          userId: input.userId,
          provider: input.provider,
          systemPrompt: decision.fallbackMode === "ask-for-url"
            ? "You are an AI assistant. Ask the user for a URL or explain what else is needed to act."
            : "You are an AI developer agent. Respond with actionable insights for the given command.",
          message: this.commandInterpreter.toAiPrompt(input.command, decision, issues)
        });
      }

      if (!latestAiSummary && decision.fallbackMode === "ask-for-url") {
        latestAiSummary = {
          provider: "system",
          text: "No URL detected. Provide a URL so the agent can open the browser and execute actions automatically."
        };
      }

      const phase = issues.length ? ["analyze", "fix", "re-test"] : ["analyze"];
      iterations.push({
        iteration,
        parsedCommand,
        routedAction,
        phase,
        workspace: workspaceResolution,
        workspaceScan,
        projectResult,
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
      parsedCommand,
      routedAction,
      decision,
      workspace: workspaceResolution,
      projectResult,
      iterations,
      aiSummary: latestAiSummary
    };
  }

  private buildProjectName(command: string) {
    const cleaned = command
      .replace(/https?:\/\/\S+/gi, "")
      .replace(/[^a-z0-9 ]/gi, " ")
      .trim()
      .split(/\s+/)
      .slice(0, 4)
      .join(" ");

    return cleaned ? cleaned.replace(/\b\w/g, (char) => char.toUpperCase()) : "Generated Project";
  }

  private detectProjectType(command: string): "website" | "saas" | "blog" | "dashboard" | "ecommerce" {
    const normalized = command.toLowerCase();
    if (normalized.includes("ecommerce") || normalized.includes("store")) {
      return "ecommerce";
    }
    if (normalized.includes("dashboard")) {
      return "dashboard";
    }
    if (normalized.includes("blog")) {
      return "blog";
    }
    if (normalized.includes("saas")) {
      return "saas";
    }
    return "website";
  }
}
