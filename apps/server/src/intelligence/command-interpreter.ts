import type { BrowserAction } from "../../../browser-engine/src/index.js";
import type { AgentDecision } from "../types.js";

export class CommandInterpreter {
  toActions(command: string, decision: AgentDecision): BrowserAction[] {
    const actions: BrowserAction[] = [];

    if (decision.targetUrl) {
      console.log(`Detected URL: ${decision.targetUrl}`);
      console.log("Opening browser");
      actions.push({ type: "openUrl", url: decision.targetUrl });
    }

    actions.push({ type: "wait", delayMs: 800 });

    const normalized = command.toLowerCase();
    const shouldAnalyzePage =
      decision.intent === "analyze" ||
      decision.intent === "fix" ||
      decision.intent === "test" ||
      decision.fallbackMode === "browser-analyze" ||
      normalized.includes("check this site") ||
      normalized.includes("check this page") ||
      normalized.includes("open figma") ||
      normalized.includes("convert it");

    if (decision.intent === "test") {
      actions.push({ type: "scroll", y: 700 });
      actions.push({ type: "extractLinks" });
    }

    if (shouldAnalyzePage) {
      actions.push({ type: "extractText", selector: "body" });
      actions.push({ type: "extractHtml", selector: "body" });
      actions.push({ type: "extractLinks" });
    }

    if (normalized.includes("screenshot") || decision.intent === "test" || decision.intent === "fix" || decision.fallbackMode === "browser-analyze") {
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
