import type { BrowserAction } from "../types.js";
import type { BrowserActionRuntime } from "./runtime-context.js";

export const runInteractionAction = async (runtime: BrowserActionRuntime, action: BrowserAction) => {
  switch (action.type) {
    case "click":
      await runtime.evaluateSelector(action.selector, "element.click();");
      return `Clicked ${action.selector}`;
    case "type":
      await runtime.evaluateSelector(
        action.selector,
        `element.focus(); element.value = ${JSON.stringify(action.text ?? "")}; element.dispatchEvent(new Event("input", { bubbles: true }));`
      );
      return `Typed into ${action.selector}`;
    default:
      return null;
  }
};
