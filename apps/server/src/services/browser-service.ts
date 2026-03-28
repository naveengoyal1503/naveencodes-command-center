import path from "node:path";
import { BrowserCommandExecutor, type BrowserAction } from "../../../browser-engine/src/index.js";
import { serverConfig } from "../config.js";
import { LogService } from "./log-service.js";

export class BrowserService {
  private readonly logService = new LogService();

  async execute(actions: BrowserAction[]) {
    console.log("Executing action");
    const executor = new BrowserCommandExecutor({
      headless: serverConfig.chrome.headless,
      port: serverConfig.chrome.port,
      chromePath: serverConfig.chrome.chromePath,
      artifactRoot: path.resolve(serverConfig.paths.browserArtifacts)
    });

    const result = await executor.run(actions);
    await this.logService.logExecution({
      scope: "browser-service",
      actions,
      success: result.success,
      errors: result.errors
    });
    return result;
  }
}
