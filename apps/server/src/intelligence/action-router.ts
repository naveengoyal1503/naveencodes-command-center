import type { RoutedAction, SupportedAiProvider } from "../types.js";
import { parseCommand } from "./command-parser.js";

export const routeAction = (command: string, options?: { url?: string; provider?: SupportedAiProvider }): RoutedAction => {
  const parsed = parseCommand(options?.url ? `${command} ${options.url}` : command);
  const targetUrl = options?.url ?? parsed.url;
  const useBrowser = Boolean(targetUrl) || parsed.intent === "fix" || parsed.intent === "analyze";
  const route =
    parsed.intent === "build"
      ? "projects"
      : useBrowser
        ? "actions"
        : parsed.intent === "analyze"
          ? "analyze"
          : "chat";

  const fallbackMode = !targetUrl
    ? parsed.isAmbiguous
      ? "ask-for-url"
      : parsed.intent === "open"
        ? "ask-for-url"
      : "ai-only"
    : parsed.isAmbiguous
      ? "browser-analyze"
      : undefined;

  const decision = {
    intent: parsed.intent,
    secondaryIntents: parsed.secondaryIntents,
    confidence: parsed.confidence,
    route,
    useBrowser: Boolean(targetUrl) || parsed.isAmbiguous,
    useAi: !targetUrl || Boolean(options?.provider) || parsed.intent !== "analyze" || parsed.isAmbiguous,
    autoLoop: parsed.intent === "fix" || parsed.intent === "test",
    targetUrl,
    fallbackMode
  } as const;

  const responseStrategy =
    !targetUrl && parsed.isAmbiguous
      ? "ask-for-url"
      : decision.useBrowser && decision.useAi
        ? "hybrid"
        : decision.useBrowser
          ? "browser"
          : "ai";

  return {
    parsed: {
      ...parsed,
      url: targetUrl
    },
    decision,
    responseStrategy
  };
};
