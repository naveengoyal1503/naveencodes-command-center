import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth-middleware.js";
import type { AuthenticatedRequest } from "../types.js";
import { ProjectService } from "../services/project-service.js";
import { LogService } from "../services/log-service.js";
import { WorkspaceManager } from "../services/workspace-manager.js";

const router = Router();
const projectService = new ProjectService();
const logService = new LogService();
const workspaceManager = new WorkspaceManager();

const createProjectSchema = z.object({
  name: z.string().min(2).max(120),
  prompt: z.string().min(10),
  type: z.enum(["website", "saas", "blog", "dashboard", "ecommerce"]).default("website"),
  framework: z.enum(["vanilla", "react"]).default("vanilla"),
  workspacePath: z.string().min(1).optional(),
  confirmWorkspace: z.boolean().default(false)
});

router.get("/", requireAuth, async (request: AuthenticatedRequest, response, next) => {
  try {
    await logService.logCommand({
      userId: request.user!.id,
      route: "/api/projects",
      method: "GET"
    });
    const workspace = await workspaceManager.getCurrentWorkspace(request.user!.id);
    const projects = await projectService.list(request.user!.id, workspace?.currentWorkspace ?? null);
    response.json({ projects, workspace });
  } catch (error) {
    next(error);
  }
});

router.post("/", requireAuth, async (request: AuthenticatedRequest, response, next) => {
  try {
    const payload = createProjectSchema.parse(request.body);
    await logService.logCommand({
      userId: request.user!.id,
      route: "/api/projects",
      method: "POST",
      name: payload.name,
      type: payload.type,
      workspacePath: payload.workspacePath
    });
    const workspace = await workspaceManager.resolveWorkspace({
      userId: request.user!.id,
      requestedPath: payload.workspacePath,
      requireWorkspace: true,
      confirmWorkspace: payload.confirmWorkspace
    });

    if (workspace.requiresWorkspace || workspace.requiresConfirmation) {
      response.status(400).json({
        workspace,
        message: workspace.message
      });
      return;
    }

    const project = await projectService.create({
      ownerId: request.user!.id,
      name: payload.name,
      prompt: payload.prompt,
      type: payload.type,
      framework: payload.framework,
      workspacePath: workspace.workspacePath!
    });
    response.status(201).json({ project, workspace });
  } catch (error) {
    next(error);
  }
});

export { router as projectsRouter };
