import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "anon-platform-secret-2024";

export interface AuthPayload {
  userId: number;
  username: string;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
    (req as any).user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith("Bearer ")) {
    const token = auth.slice(7);
    try {
      const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
      (req as any).user = payload;
    } catch {
      // silently ignore invalid token
    }
  }
  next();
}
