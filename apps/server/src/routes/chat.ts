import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth-middleware.js";
import type { AuthenticatedRequest } from "../types.js";
import { AiService } from "../services/ai-service.js";
import { KeyVaultService } from "../services/key-vault-service.js";
import { serverConfig } from "../config.js";
import { LogService } from "../services/log-service.js";

const router = Router();
const aiService = new AiService();
const keyVaultService = new KeyVaultService();
const logService = new LogService();

const chatSchema = z.object({
  message: z.string().min(1),
  systemPrompt: z.string().optional(),
  model: z.string().optional(),
  provider: z.enum(["openai", "gemini", "claude"]).optional()
});

router.post("/", requireAuth, async (request: AuthenticatedRequest, response, next) => {
  try {
    const payload = chatSchema.parse(request.body);
    const provider = payload.provider ?? serverConfig.defaultAiProvider;
    await logService.logCommand({
      userId: request.user!.id,
      route: "/api/chat",
      provider,
      message: payload.message
    });
    const apiKey = await keyVaultService.getProviderKey(request.user!.id, provider);
    if (!apiKey) {
      response.status(400).json({ error: `No API key configured for provider ${provider}.` });
      return;
    }

    const result = await aiService.chat({
      provider,
      apiKey,
      message: payload.message,
      systemPrompt: payload.systemPrompt,
      model: payload.model
    });

    response.json(result);
  } catch (error) {
    next(error);
  }
});

export { router as chatRouter };
