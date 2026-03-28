import type { Request } from "express";

export type SupportedAiProvider = "openai" | "gemini" | "claude";
export type AgentIntent = "build" | "analyze" | "fix" | "test";

export interface AgentDecision {
  intent: AgentIntent;
  secondaryIntents: AgentIntent[];
  confidence: number;
  route: "projects" | "analyze" | "actions" | "chat";
  useBrowser: boolean;
  useAi: boolean;
  autoLoop: boolean;
  targetUrl?: string | null;
}

export interface UserRecord {
  id: string;
  email: string;
  name?: string;
  passwordHash: string;
  createdAt: string;
}

export interface ProviderKeyRecord {
  provider: SupportedAiProvider;
  encryptedValue: string;
  updatedAt: string;
}

export interface ProjectRecord {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  prompt: string;
  type: "website" | "saas" | "blog" | "dashboard" | "ecommerce";
  framework: "vanilla" | "react";
  createdAt: string;
  path: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}
