import fs from "node:fs/promises";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { authRouter } from "./routes/auth.js";
import { chatRouter } from "./routes/chat.js";
import { analyzeRouter } from "./routes/analyze.js";
import { projectsRouter } from "./routes/projects.js";
import { actionsRouter, browserRouter } from "./routes/browser.js";
import { errorHandler } from "./middleware/error-handler.js";
import { serverConfig } from "./config.js";

export const createApp = async () => {
  await Promise.all([
    fs.mkdir(serverConfig.paths.secureRoot, { recursive: true }),
    fs.mkdir(serverConfig.paths.projectsRoot, { recursive: true }),
    fs.mkdir(serverConfig.paths.browserArtifacts, { recursive: true }),
    fs.mkdir(serverConfig.paths.logsRoot, { recursive: true })
  ]);

  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(rateLimit({ windowMs: 60_000, max: 120 }));
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_request, response) => {
    response.json({
      ok: true,
      name: "NaveenCodes AI Agent",
      environment: serverConfig.env
    });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/chat", chatRouter);
  app.use("/api/analyze", analyzeRouter);
  app.use("/api/actions", actionsRouter);
  app.use("/api/projects", projectsRouter);
  app.use("/api/browser", browserRouter);
  app.use(errorHandler);

  return app;
};
