import type { Request } from "express";

export type SupportedAiProvider = "openai" | "gemini" | "claude";
export type AgentIntent = "open" | "build" | "analyze" | "fix" | "test";

export interface AgentDecision {
  intent: AgentIntent;
  secondaryIntents: AgentIntent[];
  confidence: number;
  route: "projects" | "analyze" | "actions" | "chat";
  useBrowser: boolean;
  useAi: boolean;
  autoLoop: boolean;
  targetUrl?: string | null;
  fallbackMode?: "browser-analyze" | "ai-only" | "ask-for-url";
}

export interface ParsedCommand {
  input: string;
  normalizedInput: string;
  intent: AgentIntent;
  secondaryIntents: AgentIntent[];
  confidence: number;
  url: string | null;
  hasUrl: boolean;
  isAmbiguous: boolean;
}

export interface RoutedAction {
  parsed: ParsedCommand;
  decision: AgentDecision;
  responseStrategy: "browser" | "ai" | "hybrid" | "ask-for-url";
}

export interface WorkspaceSession {
  userId: string;
  currentWorkspace: string;
  confirmedAt?: string;
  updatedAt: string;
}

export interface WorkspaceResolution {
  requiresWorkspace: boolean;
  requiresConfirmation: boolean;
  workspacePath: string | null;
  message?: string;
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
