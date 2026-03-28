import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth-middleware.js";
import { BrowserService } from "../services/browser-service.js";
import { AutonomousAgentService } from "../services/autonomous-agent-service.js";
import { LogService } from "../services/log-service.js";
import type { AuthenticatedRequest } from "../types.js";

const router = Router();
const browserService = new BrowserService();
const autonomousAgentService = new AutonomousAgentService();
const logService = new LogService();

const actionSchema = z.object({
  type: z.enum(["openUrl", "navigate", "click", "type", "scroll", "screenshot", "wait", "extractText", "extractHtml", "extractLinks"]),
  url: z.string().url().optional(),
  selector: z.string().optional(),
  text: z.string().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  delayMs: z.number().int().positive().optional(),
  path: z.string().optional(),
  attribute: z.string().optional()
});

const directActionSchema = z.object({
  actions: z.array(actionSchema).min(1)
});

const interpretedActionSchema = z.object({
  command: z.string().min(1),
  url: z.string().url().optional(),
  provider: z.enum(["openai", "gemini", "claude"]).optional(),
  autoExecute: z.boolean().default(false),
  maxIterations: z.number().int().min(1).max(5).default(2),
  workspacePath: z.string().min(1).optional(),
  confirmWorkspace: z.boolean().default(false)
});

router.post("/", requireAuth, async (request: AuthenticatedRequest, response, next) => {
  try {
    await logService.logCommand({
      userId: request.user!.id,
      route: "/api/actions",
      bodyKeys: Object.keys(request.body ?? {})
    });

    if (Array.isArray(request.body?.actions)) {
      const payload = directActionSchema.parse(request.body);
      const result = await browserService.execute(payload.actions);
      response.json(result);
      return;
    }

    const payload = interpretedActionSchema.parse(request.body);
    const result = await autonomousAgentService.run({
      userId: request.user!.id,
      command: payload.command,
      url: payload.url,
      provider: payload.provider,
      maxIterations: payload.autoExecute ? payload.maxIterations : 1,
      includeAiSummary: payload.autoExecute,
      workspacePath: payload.workspacePath,
      confirmWorkspace: payload.confirmWorkspace
    });

    response.json(result);
  } catch (error) {
    next(error);
  }
});

export { router as actionsRouter };
export { router as browserRouter };
