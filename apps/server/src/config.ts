import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  SERVER_HOST: z.string().default("127.0.0.1"),
  SERVER_PORT: z.coerce.number().default(4000),
  JWT_SECRET: z.string().min(16).default("replace-with-a-long-random-secret"),
  JWT_EXPIRES_IN: z.string().default("12h"),
  ENCRYPTION_SECRET: z.string().min(16).default("replace-with-a-32-char-plus-secret"),
  DATA_ROOT: z.string().default("./data"),
  OPENAI_BASE_URL: z.string().url().default("https://api.openai.com/v1"),
  GEMINI_BASE_URL: z.string().url().default("https://generativelanguage.googleapis.com/v1beta"),
  CLAUDE_BASE_URL: z.string().url().default("https://api.anthropic.com/v1"),
  DEFAULT_AI_PROVIDER: z.enum(["openai", "gemini", "claude"]).default("openai"),
  CHROME_HEADLESS: z.coerce.boolean().default(true),
  CHROME_REMOTE_PORT: z.coerce.number().default(9222),
  CHROME_PATH: z.string().optional().default("")
});

const env = schema.parse(process.env);
const dataRoot = path.resolve(process.cwd(), env.DATA_ROOT);

export const serverConfig = {
  env: env.NODE_ENV,
  host: env.SERVER_HOST,
  port: env.SERVER_PORT,
  jwtSecret: env.JWT_SECRET,
  jwtExpiresIn: env.JWT_EXPIRES_IN,
  encryptionSecret: env.ENCRYPTION_SECRET,
  defaultAiProvider: env.DEFAULT_AI_PROVIDER,
  openAiBaseUrl: env.OPENAI_BASE_URL,
  geminiBaseUrl: env.GEMINI_BASE_URL,
  claudeBaseUrl: env.CLAUDE_BASE_URL,
  chrome: {
    headless: env.CHROME_HEADLESS,
    port: env.CHROME_REMOTE_PORT,
    chromePath: env.CHROME_PATH || undefined
  },
  paths: {
    dataRoot,
    secureRoot: path.join(dataRoot, "secure"),
    usersFile: path.join(dataRoot, "secure", "users.json"),
    keysFile: path.join(dataRoot, "secure", "provider-keys.json"),
    projectsRoot: path.join(dataRoot, "projects"),
    browserArtifacts: path.join(dataRoot, "browser-artifacts"),
    logsRoot: path.join(dataRoot, "logs"),
    commandLogFile: path.join(dataRoot, "logs", "command.log"),
    executionLogFile: path.join(dataRoot, "logs", "execution.log"),
    errorLogFile: path.join(dataRoot, "logs", "error.log")
  }
} as const;
