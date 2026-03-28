import type { BrowserAction } from "../types.js";
import type { BrowserActionRuntime } from "./runtime-context.js";

export const runMonitoringAction = async (runtime: BrowserActionRuntime, action: BrowserAction) => {
  switch (action.type) {
    case "screenshot":
      return `Captured screenshot to ${await runtime.captureScreenshot(action.path)}`;
    default:
      return null;
  }
};
