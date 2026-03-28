import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { serverConfig } from "../config.js";
import type { WorkspaceResolution, WorkspaceSession } from "../types.js";
import { JsonStore } from "../store/json-store.js";
import { LogService } from "./log-service.js";

type WorkspaceStore = Record<string, WorkspaceSession>;

const WINDOWS_BLOCKED = [
  "c:\\windows",
  "c:\\program files",
  "c:\\program files (x86)",
  "c:\\"
];

const UNIX_BLOCKED = [
  "/",
  "/bin",
  "/boot",
  "/dev",
  "/etc",
  "/lib",
  "/proc",
  "/root",
  "/sbin",
  "/sys",
  "/usr",
  "/var",
  "/tmp"
];

export class WorkspaceManager {
  private readonly store = new JsonStore<WorkspaceStore>(serverConfig.paths.workspacesFile, {});
  private readonly logService = new LogService();
  private readonly projectRoot = path.resolve(process.cwd());

  async getCurrentWorkspace(userId: string) {
    const sessions = await this.store.read();
    return sessions[userId] ?? null;
  }

  async setWorkspace(userId: string, workspacePath: string, confirm = false) {
    const resolved = await this.validateWorkspacePath(workspacePath);
    const sessions = await this.store.read();
    const now = new Date().toISOString();

    sessions[userId] = {
      userId,
      currentWorkspace: resolved,
      updatedAt: now,
      confirmedAt: confirm ? now : sessions[userId]?.confirmedAt
    };

    await this.store.write(sessions);
    await this.logService.logExecution({
      scope: "workspace",
      userId,
      selectedWorkspace: resolved,
      confirmed: confirm
    });

    return sessions[userId];
  }

  async switchWorkspace(userId: string, workspacePath: string, confirm = false) {
    return this.setWorkspace(userId, workspacePath, confirm);
  }

  async resolveWorkspace(input: {
    userId: string;
    requestedPath?: string;
    requireWorkspace: boolean;
    confirmWorkspace?: boolean;
  }): Promise<WorkspaceResolution> {
    if (!input.requireWorkspace) {
      const current = await this.getCurrentWorkspace(input.userId);
      return {
        requiresWorkspace: false,
        requiresConfirmation: false,
        workspacePath: current?.currentWorkspace ?? null
      };
    }

    if (!input.requestedPath) {
      const current = await this.getCurrentWorkspace(input.userId);
      if (!current) {
        return {
          requiresWorkspace: true,
          requiresConfirmation: false,
          workspacePath: null,
          message: "Please provide a target folder path where I should create or modify files."
        };
      }

      if (!current.confirmedAt) {
        return {
          requiresWorkspace: true,
          requiresConfirmation: true,
          workspacePath: current.currentWorkspace,
          message: "Do you want me to proceed in this folder?"
        };
      }

      return {
        requiresWorkspace: false,
        requiresConfirmation: false,
        workspacePath: current.currentWorkspace
      };
    }

    const session = await this.setWorkspace(input.userId, input.requestedPath, Boolean(input.confirmWorkspace));
    if (!input.confirmWorkspace) {
      return {
        requiresWorkspace: true,
        requiresConfirmation: true,
        workspacePath: session.currentWorkspace,
        message: "Do you want me to proceed in this folder?"
      };
    }

    return {
      requiresWorkspace: false,
      requiresConfirmation: false,
      workspacePath: session.currentWorkspace
    };
  }

  async ensureInsideWorkspace(workspacePath: string, targetPath: string) {
    const resolvedWorkspace = path.resolve(workspacePath);
    const resolvedTarget = path.resolve(targetPath);
    const relative = path.relative(resolvedWorkspace, resolvedTarget);

    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new Error("Unsafe file operation blocked: target path is outside the selected workspace.");
    }

    return resolvedTarget;
  }

  async ensureWorkspaceExists(workspacePath: string) {
    await fs.mkdir(workspacePath, { recursive: true });
    return workspacePath;
  }

  async scanWorkspace(workspacePath: string) {
    const entries = await fs.readdir(workspacePath, { withFileTypes: true });
    return entries.map((entry) => ({
      name: entry.name,
      type: entry.isDirectory() ? "directory" : "file"
    }));
  }

  private async validateWorkspacePath(candidate: string) {
    const resolved = path.resolve(candidate);
    const normalized = resolved.toLowerCase();
    const repoRoot = this.projectRoot.toLowerCase();

    if (normalized === repoRoot || normalized.startsWith(`${repoRoot}${path.sep}`)) {
      throw new Error("Unsafe workspace path: the selected folder is inside the AI agent repository.");
    }

    const blocked = process.platform === "win32" ? WINDOWS_BLOCKED : UNIX_BLOCKED;
    if (blocked.some((entry) => normalized === entry || normalized.startsWith(`${entry}${path.sep}`))) {
      throw new Error("Unsafe workspace path: system folders and root locations are blocked.");
    }

    const homeRoot = path.resolve(os.homedir()).toLowerCase();
    if (normalized === homeRoot) {
      throw new Error("Unsafe workspace path: select a project folder, not the home directory itself.");
    }

    await fs.mkdir(resolved, { recursive: true });
    return resolved;
  }
}
