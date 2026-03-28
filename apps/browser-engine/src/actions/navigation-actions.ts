import type { BrowserAction } from "../types.js";
import type { BrowserActionRuntime } from "./runtime-context.js";

export const runNavigationAction = async (runtime: BrowserActionRuntime, action: BrowserAction) => {
  const { Page, Runtime } = runtime.client;

  switch (action.type) {
    case "openUrl":
    case "navigate":
      if (!action.url) {
        throw new Error(`${action.type} requires a url.`);
      }
      await Page.navigate({ url: action.url });
      await Page.loadEventFired();
      return `Navigated to ${action.url}`;
    case "scroll":
      await Runtime.evaluate({
        expression: `window.scrollBy(${action.x ?? 0}, ${action.y ?? 640});`,
        awaitPromise: false
      });
      return `Scrolled by ${action.x ?? 0}, ${action.y ?? 640}`;
    case "wait":
      await new Promise((resolve) => setTimeout(resolve, action.delayMs ?? 1000));
      return `Waited ${action.delayMs ?? 1000}ms`;
    default:
      return null;
  }
};
