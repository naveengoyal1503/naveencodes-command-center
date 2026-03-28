import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth-middleware.js";
import type { AuthenticatedRequest } from "../types.js";
import { AutonomousAgentService } from "../services/autonomous-agent-service.js";
import { LogService } from "../services/log-service.js";

const router = Router();
const autonomousAgentService = new AutonomousAgentService();
const logService = new LogService();

const analyzeSchema = z.object({
  command: z.string().min(1),
  url: z.string().url().optional(),
  provider: z.enum(["openai", "gemini", "claude"]).optional(),
  includeAiSummary: z.boolean().default(false),
  autoExecute: z.boolean().default(false),
  maxIterations: z.number().int().min(1).max(5).default(2),
  workspacePath: z.string().min(1).optional(),
  confirmWorkspace: z.boolean().default(false)
});

router.post("/", requireAuth, async (request: AuthenticatedRequest, response, next) => {
  try {
    const payload = analyzeSchema.parse(request.body);
    await logService.logCommand({
      userId: request.user!.id,
      route: "/api/analyze",
      command: payload.command,
      provider: payload.provider
    });

    const analysis = await autonomousAgentService.run({
      userId: request.user!.id,
      command: payload.command,
      url: payload.url,
      provider: payload.provider,
      maxIterations: payload.autoExecute ? payload.maxIterations : 1,
      includeAiSummary: payload.includeAiSummary || payload.autoExecute,
      workspacePath: payload.workspacePath,
      confirmWorkspace: payload.confirmWorkspace
    });

    response.json({
      command: payload.command,
      parsedCommand: analysis.parsedCommand,
      routedAction: analysis.routedAction,
      url: payload.url ?? analysis.decision.targetUrl,
      intent: analysis.decision,
      recommendedModules: [
        "auth",
        "chat",
        "projects",
        analysis.decision.useBrowser ? "actions" : null
      ].filter(Boolean),
      autoExecution: payload.autoExecute,
      iterations: analysis.iterations,
      aiSummary: analysis.aiSummary
    });
  } catch (error) {
    next(error);
  }
});

export { router as analyzeRouter };
