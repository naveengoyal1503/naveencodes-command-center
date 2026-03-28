# Architecture

## Overview

NaveenCodes AI Agent is structured as a modular repository with two primary runtime applications and an intelligence layer:

- `apps/server`: secured Node.js API server for auth, AI routing, project operations, and browser command orchestration.
- `apps/browser-engine`: reusable Chrome DevTools Protocol engine for low-level browser automation.
- `apps/server/src/intelligence`: decision engine, command interpreter, and AI client abstractions for autonomous routing.

The browser extension acts as a thin remote client that captures current-page context and sends commands to the backend.

## Request Flow

1. A client authenticates with `/api/auth`.
2. The user stores a BYOK provider credential through the encrypted vault.
3. The client sends a command to `/api/analyze`, `/api/chat`, `/api/projects`, `/api/actions`, or compatibility route `/api/browser`.
4. The server classifies intent, interprets commands into actions, and dispatches work to the browser engine and AI provider adapters.
5. Results are returned as structured JSON for UI, CLI, or extension consumption.

## Security Model

- JWT bearer auth protects all non-auth routes.
- Provider API keys are encrypted at rest with AES-256-GCM before being written to disk.
- Inputs are validated with Zod before execution.
- Helmet and rate limiting reduce common HTTP attack surface.
- Command, execution, and error logs are recorded under `data/logs`.
