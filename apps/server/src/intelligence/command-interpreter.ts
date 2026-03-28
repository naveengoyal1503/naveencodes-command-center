import type { BrowserAction } from "../../../browser-engine/src/index.js";
import type { AgentDecision } from "../types.js";

export class CommandInterpreter {
  toActions(command: string, decision: AgentDecision): BrowserAction[] {
    const actions: BrowserAction[] = [];

    if (decision.targetUrl) {
      actions.push({ type: "openUrl", url: decision.targetUrl });
    }

    actions.push({ type: "wait", delayMs: 800 });

    if (decision.intent === "test") {
      actions.push({ type: "scroll", y: 700 });
      actions.push({ type: "extractLinks" });
    }

    if (decision.intent === "analyze" || decision.intent === "fix") {
      actions.push({ type: "extractText", selector: "body" });
      actions.push({ type: "extractLinks" });
    }

    if (command.toLowerCase().includes("screenshot") || decision.intent === "test" || decision.intent === "fix") {
      actions.push({ type: "screenshot" });
    }

    return actions;
  }

  toAiPrompt(command: string, decision: AgentDecision, issues: string[]) {
    return [
      `Intent: ${decision.intent}`,
      decision.targetUrl ? `Target URL: ${decision.targetUrl}` : "Target URL: none",
      `Command: ${command}`,
      issues.length ? `Observed issues:\n- ${issues.join("\n- ")}` : "Observed issues: none"
    ].join("\n");
  }
}
