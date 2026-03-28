import type { NextFunction, Request, Response } from "express";
import { LogService } from "../services/log-service.js";

const logService = new LogService();

export const errorHandler = (error: unknown, request: Request, response: Response, _next: NextFunction) => {
  const message = error instanceof Error ? error.message : "Unexpected server error.";
  void logService.logError({
    route: request.originalUrl,
    method: request.method,
    message
  });
  response.status(500).json({
    error: message
  });
};
