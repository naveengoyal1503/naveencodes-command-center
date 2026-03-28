import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { serverConfig } from "../config.js";
import type { AuthenticatedUser, UserRecord } from "../types.js";
import { JsonStore } from "../store/json-store.js";

export class AuthService {
  private readonly store = new JsonStore<UserRecord[]>(serverConfig.paths.usersFile, []);

  async register(input: { email: string; password: string; name?: string }) {
    const users = await this.store.read();
    const normalizedEmail = input.email.toLowerCase();
    if (users.some((user) => user.email === normalizedEmail)) {
      throw new Error("User already exists.");
    }

    const user: UserRecord = {
      id: crypto.randomUUID(),
      email: normalizedEmail,
      name: input.name,
      passwordHash: this.hashPassword(input.password),
      createdAt: new Date().toISOString()
    };

    users.push(user);
    await this.store.write(users);
    return this.toPublicUser(user);
  }

  async login(input: { email: string; password: string }) {
    const users = await this.store.read();
    const user = users.find((entry) => entry.email === input.email.toLowerCase());
    if (!user || !this.verifyPassword(input.password, user.passwordHash)) {
      throw new Error("Invalid credentials.");
    }

    const publicUser = this.toPublicUser(user);
    return {
      user: publicUser,
      token: jwt.sign(publicUser, serverConfig.jwtSecret as jwt.Secret, {
        expiresIn: serverConfig.jwtExpiresIn as jwt.SignOptions["expiresIn"]
      })
    };
  }

  verifyToken(token: string) {
    return jwt.verify(token, serverConfig.jwtSecret) as AuthenticatedUser;
  }

  private toPublicUser(user: UserRecord): AuthenticatedUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name
    };
  }

  private hashPassword(password: string) {
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.scryptSync(password, salt, 64).toString("hex");
    return `${salt}:${hash}`;
  }

  private verifyPassword(password: string, stored: string) {
    const [salt, originalHash] = stored.split(":");
    const derivedHash = crypto.scryptSync(password, salt, 64).toString("hex");
    return crypto.timingSafeEqual(Buffer.from(originalHash, "hex"), Buffer.from(derivedHash, "hex"));
  }
}
