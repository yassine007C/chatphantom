import { Router, type IRouter } from "express";
import { db, publicPostsTable, usersTable } from "@workspace/db";
import { eq, desc, count } from "drizzle-orm";
import { CreatePostBody, GetFeedQueryParams } from "@workspace/api-zod";
import { requireAuth, optionalAuth } from "../middlewares/auth";
import { rateLimit } from "../middlewares/rateLimit";
import { filterContent } from "../lib/contentFilter";

const router: IRouter = Router();

router.get("/feed", optionalAuth, async (req, res) => {
  const parsed = GetFeedQueryParams.safeParse(req.query);
  const page = parsed.success ? (parsed.data.page ?? 1) : 1;
  const limit = parsed.success ? (parsed.data.limit ?? 20) : 20;
  const offset = (page - 1) * limit;

  const [{ total }] = await db.select({ total: count() }).from(publicPostsTable);

  const posts = await db
    .select({
      id: publicPostsTable.id,
      content: publicPostsTable.content,
      imageUrl: publicPostsTable.imageUrl,
      isAnonymous: publicPostsTable.isAnonymous,
      userId: publicPostsTable.userId,
      username: usersTable.username,
      avatarUrl: usersTable.avatarUrl,
      createdAt: publicPostsTable.createdAt,
    })
    .from(publicPostsTable)
    .leftJoin(usersTable, eq(publicPostsTable.userId, usersTable.id))
    .orderBy(desc(publicPostsTable.createdAt))
    .limit(limit)
    .offset(offset);

  const result = posts.map((p) => ({
    id: p.id,
    content: p.content,
    imageUrl: p.imageUrl ?? null,
    isAnonymous: p.isAnonymous,
    username: p.isAnonymous ? null : (p.username ?? null),
    avatarUrl: p.isAnonymous ? null : (p.avatarUrl ?? null),
    createdAt: p.createdAt,
  }));

  res.json({ posts: result, total: Number(total), page, limit });
});

router.post(
  "/feed",
  requireAuth,
  rateLimit("create_post", 10, 60),
  async (req, res) => {
    const parsed = CreatePostBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }
    const user = (req as any).user;
    const content = filterContent(parsed.data.content);
    const imageUrl = (parsed.data as any).imageUrl ?? null;

    const [post] = await db
      .insert(publicPostsTable)
      .values({
        userId: user.userId,
        content,
        imageUrl,
        isAnonymous: parsed.data.isAnonymous,
      })
      .returning();

    res.status(201).json({
      id: post.id,
      content: post.content,
      imageUrl: post.imageUrl ?? null,
      isAnonymous: post.isAnonymous,
      username: post.isAnonymous ? null : user.username,
      avatarUrl: null,
      createdAt: post.createdAt,
    });
  }
);

export default router;
