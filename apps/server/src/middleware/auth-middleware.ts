import type { NextFunction, Response } from "express";
import type { AuthenticatedRequest } from "../types.js";
import { AuthService } from "../services/auth-service.js";

const authService = new AuthService();

export const requireAuth = (request: AuthenticatedRequest, response: Response, next: NextFunction) => {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    response.status(401).json({ error: "Missing bearer token." });
    return;
  }

  try {
    request.user = authService.verifyToken(header.replace("Bearer ", ""));
    next();
  } catch {
    response.status(401).json({ error: "Invalid or expired token." });
  }
};
