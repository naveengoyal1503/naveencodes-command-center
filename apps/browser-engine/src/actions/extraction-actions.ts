import type { BrowserAction } from "../types.js";
import type { BrowserActionRuntime } from "./runtime-context.js";

export const runExtractionAction = async (runtime: BrowserActionRuntime, action: BrowserAction) => {
  const { Runtime } = runtime.client;

  switch (action.type) {
    case "extractText": {
      const selector = action.selector ?? "body";
      const result = await Runtime.evaluate({
        expression: `(() => {
          const element = document.querySelector(${JSON.stringify(selector)});
          return element ? element.textContent ?? "" : "";
        })()`,
        returnByValue: true
      });
      return {
        summary: `Extracted text from ${selector}`,
        data: { type: "text", selector, value: String(result.result.value ?? "") }
      };
    }
    case "extractHtml": {
      const selector = action.selector ?? "body";
      const result = await Runtime.evaluate({
        expression: `(() => {
          const element = document.querySelector(${JSON.stringify(selector)});
          return element ? element.outerHTML ?? "" : "";
        })()`,
        returnByValue: true
      });
      return {
        summary: `Extracted HTML from ${selector}`,
        data: { type: "html", selector, value: String(result.result.value ?? "") }
      };
    }
    case "extractLinks": {
      const result = await Runtime.evaluate({
        expression: `Array.from(document.links).map(link => link.href)`,
        returnByValue: true
      });
      return {
        summary: "Extracted links from page",
        data: { type: "links", value: Array.isArray(result.result.value) ? result.result.value : [] }
      };
    }
    default:
      return null;
  }
};
