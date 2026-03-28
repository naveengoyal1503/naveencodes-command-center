import { Router } from "express";
import { z } from "zod";
import { AuthService } from "../services/auth-service.js";
import { KeyVaultService } from "../services/key-vault-service.js";
import { requireAuth } from "../middleware/auth-middleware.js";
import type { AuthenticatedRequest } from "../types.js";

const router = Router();
const authService = new AuthService();
const keyVaultService = new KeyVaultService();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(120).optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const providerKeySchema = z.object({
  provider: z.enum(["openai", "gemini", "claude"]),
  apiKey: z.string().min(10)
});

router.post("/register", async (request, response, next) => {
  try {
    const payload = registerSchema.parse(request.body);
    const user = await authService.register(payload);
    response.status(201).json({ user });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (request, response, next) => {
  try {
    const payload = loginSchema.parse(request.body);
    const result = await authService.login(payload);
    response.json(result);
  } catch (error) {
    next(error);
  }
});

router.get("/me", requireAuth, async (request: AuthenticatedRequest, response) => {
  response.json({ user: request.user });
});

router.put("/provider-key", requireAuth, async (request: AuthenticatedRequest, response, next) => {
  try {
    const payload = providerKeySchema.parse(request.body);
    await keyVaultService.setProviderKey(request.user!.id, payload.provider, payload.apiKey);
    response.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.get("/provider-key", requireAuth, async (request: AuthenticatedRequest, response, next) => {
  try {
    const providers = await keyVaultService.listProviderKeys(request.user!.id);
    response.json({ providers });
  } catch (error) {
    next(error);
  }
});

router.delete("/provider-key/:provider", requireAuth, async (request: AuthenticatedRequest, response, next) => {
  try {
    const provider = z.enum(["openai", "gemini", "claude"]).parse(request.params.provider);
    await keyVaultService.removeProviderKey(request.user!.id, provider);
    response.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

export { router as authRouter };
