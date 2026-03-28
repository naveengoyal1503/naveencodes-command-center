import fs from "node:fs/promises";
import path from "node:path";
import { serverConfig } from "../config.js";

export class LogService {
  async logCommand(entry: Record<string, unknown>) {
    await this.append(serverConfig.paths.commandLogFile, {
      level: "info",
      type: "command",
      timestamp: new Date().toISOString(),
      ...entry
    });
  }

  async logExecution(entry: Record<string, unknown>) {
    await this.append(serverConfig.paths.executionLogFile, {
      level: "info",
      type: "execution",
      timestamp: new Date().toISOString(),
      ...entry
    });
  }

  async logError(entry: Record<string, unknown>) {
    await this.append(serverConfig.paths.errorLogFile, {
      level: "error",
      type: "error",
      timestamp: new Date().toISOString(),
      ...entry
    });
  }

  private async append(filePath: string, entry: Record<string, unknown>) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.appendFile(filePath, `${JSON.stringify(entry)}\n`, "utf8");
  }
}
