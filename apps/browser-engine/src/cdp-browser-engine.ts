import fs from "node:fs/promises";
import path from "node:path";
import CDP from "chrome-remote-interface";
import { launch, type LaunchedChrome } from "chrome-launcher";
import type { BrowserAction, BrowserConsoleEntry, BrowserExecutionResult, BrowserNetworkEntry } from "./types.js";
import { runNavigationAction } from "./actions/navigation-actions.js";
import { runInteractionAction } from "./actions/interaction-actions.js";
import { runMonitoringAction } from "./actions/monitoring-actions.js";
import { runExtractionAction } from "./actions/extraction-actions.js";

export interface BrowserEngineOptions {
  headless: boolean;
  port: number;
  chromePath?: string;
  artifactRoot: string;
}

export class CdpBrowserEngine {
  private chrome: LaunchedChrome | null = null;
  private client: Awaited<ReturnType<typeof CDP>> | null = null;
  private readonly consoleLogs: BrowserConsoleEntry[] = [];
  private readonly networkLogs: BrowserNetworkEntry[] = [];

  constructor(private readonly options: BrowserEngineOptions) {}

  async connect() {
    if (!this.chrome) {
      this.chrome = await launch({
        chromePath: this.options.chromePath || undefined,
        port: this.options.port,
        chromeFlags: [
          `--remote-debugging-port=${this.options.port}`,
          this.options.headless ? "--headless=new" : "",
          "--disable-gpu",
          "--no-first-run",
          "--no-default-browser-check"
        ].filter(Boolean)
      });
    }

    if (!this.client) {
      this.client = await CDP({ port: this.options.port });
      const { Network, Page, Runtime } = this.client;
      await Promise.all([Network.enable(), Page.enable(), Runtime.enable()]);

      Runtime.consoleAPICalled((event: any) => {
        const message = event.args.map((arg: any) => arg.value ?? arg.description ?? "").join(" ");
        this.consoleLogs.push({
          type: event.type,
          message,
          timestamp: new Date().toISOString()
        });
      });

      Network.requestWillBeSent((event: any) => {
        this.networkLogs.push({
          type: "request",
          url: event.request.url,
          method: event.request.method,
          timestamp: new Date().toISOString()
        });
      });

      Network.responseReceived((event: any) => {
        this.networkLogs.push({
          type: "response",
          url: event.response.url,
          status: event.response.status,
          timestamp: new Date().toISOString()
        });
      });

      Network.loadingFailed((event: any) => {
        this.networkLogs.push({
          type: "failure",
          url: event.requestId,
          details: event.errorText,
          timestamp: new Date().toISOString()
        });
      });
    }
  }

  async execute(actions: BrowserAction[]): Promise<BrowserExecutionResult> {
    const steps: BrowserExecutionResult["steps"] = [];
    const extracted: BrowserExecutionResult["extracted"] = [];
    const errors: string[] = [];

    try {
      await this.connect();
      if (!this.client) {
        throw new Error("CDP client failed to initialize.");
      }

      const { Runtime } = this.client;
      const runtime = {
        client: this.client,
        evaluateSelector: (selector: string | undefined, body: string) => this.evaluateSelector(selector, body),
        captureScreenshot: (filePath?: string) => this.captureScreenshot(filePath)
      };

      for (const action of actions) {
        const navigationSummary = await runNavigationAction(runtime, action);
        if (navigationSummary) {
          steps.push({ action: action.type, summary: navigationSummary });
          continue;
        }

        const interactionSummary = await runInteractionAction(runtime, action);
        if (interactionSummary) {
          steps.push({ action: action.type, summary: interactionSummary });
          continue;
        }

        const monitoringSummary = await runMonitoringAction(runtime, action);
        if (monitoringSummary) {
          steps.push({ action: action.type, summary: monitoringSummary });
          continue;
        }

        const extractionResult = await runExtractionAction(runtime, action);
        if (extractionResult) {
          steps.push({ action: action.type, summary: extractionResult.summary });
          extracted.push(extractionResult.data);
        }
      }

      const title = await Runtime.evaluate({
        expression: "document.title",
        returnByValue: true
      });
      const currentUrl = await Runtime.evaluate({
        expression: "window.location.href",
        returnByValue: true
      });

      const screenshotStep = steps.find((step) => step.action === "screenshot");
      const screenshotPath = screenshotStep?.summary.split(" to ").at(-1);

      return {
        success: errors.length === 0,
        title: String(title.result.value ?? ""),
        currentUrl: String(currentUrl.result.value ?? ""),
        screenshotPath,
        consoleLogs: [...this.consoleLogs],
        networkLogs: [...this.networkLogs],
        extracted,
        errors,
        steps
      };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Browser execution failed.");
      return {
        success: false,
        currentUrl: undefined,
        title: undefined,
        screenshotPath: undefined,
        consoleLogs: [...this.consoleLogs],
        networkLogs: [...this.networkLogs],
        extracted,
        errors,
        steps
      };
    }
  }

  async shutdown() {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
    if (this.chrome) {
      await this.chrome.kill();
      this.chrome = null;
    }
  }

  private async evaluateSelector(selector: string | undefined, body: string) {
    if (!this.client || !selector) {
      throw new Error("A selector is required for this action.");
    }

    const { Runtime } = this.client;
    await Runtime.evaluate({
      expression: `(() => {
        const element = document.querySelector(${JSON.stringify(selector)});
        if (!element) {
          throw new Error("Selector not found: " + ${JSON.stringify(selector)});
        }
        ${body}
        return true;
      })();`,
      awaitPromise: true
    });
  }

  private async captureScreenshot(filePath?: string) {
    if (!this.client) {
      throw new Error("CDP client is not ready.");
    }

    const finalPath = filePath ?? path.join(this.options.artifactRoot, `browser-${Date.now()}.png`);
    await fs.mkdir(path.dirname(finalPath), { recursive: true });

    const { Page } = this.client;
    const screenshot = await Page.captureScreenshot({ format: "png", fromSurface: true });
    await fs.writeFile(finalPath, Buffer.from(screenshot.data, "base64"));
    return finalPath;
  }
}
