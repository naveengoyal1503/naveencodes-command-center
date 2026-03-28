import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth-middleware.js";
import type { AuthenticatedRequest } from "../types.js";
import { ProjectService } from "../services/project-service.js";
import { LogService } from "../services/log-service.js";

const router = Router();
const projectService = new ProjectService();
const logService = new LogService();

const createProjectSchema = z.object({
  name: z.string().min(2).max(120),
  prompt: z.string().min(10),
  type: z.enum(["website", "saas", "blog", "dashboard", "ecommerce"]).default("website"),
  framework: z.enum(["vanilla", "react"]).default("vanilla")
});

router.get("/", requireAuth, async (request: AuthenticatedRequest, response, next) => {
  try {
    await logService.logCommand({
      userId: request.user!.id,
      route: "/api/projects",
      method: "GET"
    });
    const projects = await projectService.list(request.user!.id);
    response.json({ projects });
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
      type: payload.type
    });
    const project = await projectService.create({
      ownerId: request.user!.id,
      name: payload.name,
      prompt: payload.prompt,
      type: payload.type,
      framework: payload.framework
    });
    response.status(201).json({ project });
  } catch (error) {
    next(error);
  }
});

export { router as projectsRouter };
