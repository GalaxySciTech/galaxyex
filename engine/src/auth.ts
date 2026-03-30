import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { Request, Response, NextFunction } from "express";
import { UserModel } from "./models.js";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-in-production";
const JWT_EXPIRES_IN = "7d";

export interface AuthPayload {
  userId: string;
  email: string;
  role: "user" | "admin";
}

export interface AuthRequest extends Request {
  auth?: AuthPayload;
}

export function signToken(payload: AuthPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): AuthPayload {
  return jwt.verify(token, JWT_SECRET) as AuthPayload;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ message: "Missing or invalid Authorization header." });
    return;
  }

  try {
    req.auth = verifyToken(header.slice(7));
    next();
  } catch {
    res.status(401).json({ message: "Token expired or invalid." });
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.auth?.role !== "admin") {
      res.status(403).json({ message: "Admin access required." });
      return;
    }
    next();
  });
}

export async function registerUser(email: string, password: string, role: "user" | "admin" = "user") {
  const existing = await UserModel.findOne({ email });
  if (existing) {
    throw new Error("Email already registered.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await UserModel.create({ email, passwordHash, role });
  return user;
}

export async function loginUser(email: string, password: string) {
  const user = await UserModel.findOne({ email });
  if (!user) {
    throw new Error("Invalid email or password.");
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new Error("Invalid email or password.");
  }

  return user;
}

export async function ensureDemoUser() {
  const email = "demo@galaxyex.io";
  const existing = await UserModel.findOne({ email });
  if (existing) return existing;

  return registerUser(email, "demo1234", "user");
}
