import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

process.env.DATA_ROOT = "./data/test-smoke";

const { AuthService } = await import("../apps/server/src/services/auth-service.js");
const { KeyVaultService } = await import("../apps/server/src/services/key-vault-service.js");
const { DecisionEngine } = await import("../apps/server/src/intelligence/decision-engine.js");
const { CommandInterpreter } = await import("../apps/server/src/intelligence/command-interpreter.js");
const { ProjectService } = await import("../apps/server/src/services/project-service.js");

const authService = new AuthService();
const vaultService = new KeyVaultService();
const decisionEngine = new DecisionEngine();
const commandInterpreter = new CommandInterpreter();
const projectService = new ProjectService();

await fs.rm(path.resolve(process.cwd(), "data/test-smoke"), { recursive: true, force: true });

const user = await authService.register({
  email: "smoke@example.com",
  password: "Password123!",
  name: "Smoke"
});

const login = await authService.login({
  email: "smoke@example.com",
  password: "Password123!"
});

await vaultService.setProviderKey(user.id, "openai", "sk-test-1234567890");
await vaultService.setProviderKey(user.id, "claude", "claude-test-1234567890");
const decrypted = await vaultService.getProviderKey(user.id, "openai");
const claudeKey = await vaultService.getProviderKey(user.id, "claude");
const decision = decisionEngine.decide({
  command: "build a SaaS dashboard and fix login flow",
  url: "https://example.com"
});
const actions = commandInterpreter.toActions("test checkout flow screenshot", {
  intent: "test",
  secondaryIntents: ["analyze"],
  confidence: 0.9,
  route: "actions",
  useBrowser: true,
  useAi: true,
  autoLoop: true,
  targetUrl: "https://example.com"
});
const project = await projectService.create({
  ownerId: user.id,
  name: "Smoke Project",
  prompt: "Create a demo project for smoke testing",
  type: "saas",
  framework: "vanilla"
});

assert.ok(login.token);
assert.equal(decrypted, "sk-test-1234567890");
assert.equal(claudeKey, "claude-test-1234567890");
assert.equal(decision.intent, "build");
assert.equal(decision.route, "projects");
assert.ok(actions.some((action) => action.type === "screenshot"));
assert.equal(project.slug, "smoke-project");

console.log("Smoke test passed");
