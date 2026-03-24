import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import {
  RegisterBody,
  LoginBody,
} from "@workspace/api-zod";
import { requireAuth, signToken } from "../middlewares/auth";

const router: IRouter = Router();

router.post("/auth/register", async (req, res) => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid input" });
    return;
  }
  const { username, email, password } = parsed.data;

  const existing = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(or(eq(usersTable.username, username), eq(usersTable.email, email)))
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "Username or email already taken" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await db
    .insert(usersTable)
    .values({ username, email, passwordHash })
    .returning();

  const token = signToken({ userId: user.id, username: user.username });
  res.status(201).json({
    user: { id: user.id, username: user.username, email: user.email, createdAt: user.createdAt },
    token,
  });
});

router.post("/auth/login", async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { usernameOrEmail, password } = parsed.data;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(or(eq(usersTable.username, usernameOrEmail), eq(usersTable.email, usernameOrEmail)))
    .limit(1);

  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = signToken({ userId: user.id, username: user.username });
  res.json({
    user: { id: user.id, username: user.username, email: user.email, createdAt: user.createdAt },
    token,
  });
});

router.post("/auth/logout", (_req, res) => {
  res.json({ message: "Logged out successfully" });
});

router.get("/auth/me", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const [dbUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, user.userId))
    .limit(1);

  if (!dbUser) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  res.json({
    id: dbUser.id,
    username: dbUser.username,
    email: dbUser.email,
    createdAt: dbUser.createdAt,
  });
});

export default router;
