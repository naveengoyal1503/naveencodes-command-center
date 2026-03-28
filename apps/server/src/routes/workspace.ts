import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth-middleware.js";
import type { AuthenticatedRequest } from "../types.js";
import { WorkspaceManager } from "../services/workspace-manager.js";
import { LogService } from "../services/log-service.js";

const router = Router();
const workspaceManager = new WorkspaceManager();
const logService = new LogService();

const workspaceSchema = z.object({
  workspacePath: z.string().min(1),
  confirmWorkspace: z.boolean().default(false)
});

router.get("/", requireAuth, async (request: AuthenticatedRequest, response, next) => {
  try {
    const workspace = await workspaceManager.getCurrentWorkspace(request.user!.id);
    response.json({ workspace });
  } catch (error) {
    next(error);
  }
});

router.post("/", requireAuth, async (request: AuthenticatedRequest, response, next) => {
  try {
    const payload = workspaceSchema.parse(request.body);
    await logService.logCommand({
      userId: request.user!.id,
      route: "/api/workspace",
      workspacePath: payload.workspacePath,
      confirmWorkspace: payload.confirmWorkspace
    });

    const workspace = await workspaceManager.setWorkspace(
      request.user!.id,
      payload.workspacePath,
      payload.confirmWorkspace
    );

    response.json({
      workspace,
      message: payload.confirmWorkspace
        ? "Workspace selected and confirmed."
        : "Do you want me to proceed in this folder?"
    });
  } catch (error) {
    next(error);
  }
});

export { router as workspaceRouter };
