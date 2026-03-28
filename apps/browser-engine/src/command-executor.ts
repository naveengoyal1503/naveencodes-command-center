import type { BrowserAction, BrowserExecutionResult } from "./types.js";
import { CdpBrowserEngine, type BrowserEngineOptions } from "./cdp-browser-engine.js";

export class BrowserCommandExecutor {
  private readonly engine: CdpBrowserEngine;

  constructor(options: BrowserEngineOptions) {
    this.engine = new CdpBrowserEngine(options);
  }

  async run(actions: BrowserAction[]): Promise<BrowserExecutionResult> {
    try {
      return await this.engine.execute(actions);
    } finally {
      await this.engine.shutdown();
    }
  }
}
