import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable, conversationsTable, messagesTable, postsTable } from "@workspace/db";
import { eq, or, and, count } from "drizzle-orm";
import { SendAnonymousMessageBody } from "@workspace/api-zod";
import { rateLimit } from "../middlewares/rateLimit";
import { filterContent } from "../lib/contentFilter";

const router: IRouter = Router();

// --- مسارات المستخدمين ---
router.get("/users", async (_req, res) => {
  const users = await db
    .select({ 
      id: usersTable.id, 
      username: usersTable.username, 
      avatarUrl: usersTable.avatarUrl, 
      createdAt: usersTable.createdAt 
    })
    .from(usersTable)
    .orderBy(usersTable.username)
    .limit(100);

  res.json({ users: users.map(u => ({ ...u, avatarUrl: u.avatarUrl ?? null })) });
});

router.get("/users/:username", async (req, res) => {
  const { username } = req.params;
  const [user] = await db
    .select({ 
      id: usersTable.id, 
      username: usersTable.username, 
      avatarUrl: usersTable.avatarUrl, 
      createdAt: usersTable.createdAt 
    })
    .from(usersTable)
    .where(eq(usersTable.username, username))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ ...user, avatarUrl: user.avatarUrl ?? null });
});

router.post(
  "/users/:username/message",
  rateLimit("send_message", 20, 60),
  async (req, res) => {
    const { username } = req.params;
    const [owner] = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
    if (!owner) { res.status(404).json({ error: "User not found" }); return; }

    const parsed = SendAnonymousMessageBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

    const guestSessionId = parsed.data.guestSessionId || `guest_${Date.now()}`;
    const body = filterContent(parsed.data.body);
    const imageUrl = (parsed.data as any).imageUrl ?? null;

    let [conversation] = await db
      .select()
      .from(conversationsTable)
      .where(and(eq(conversationsTable.ownerId, owner.id), eq(conversationsTable.guestSessionId, guestSessionId)))
      .limit(1);

    if (!conversation) {
      const [{ total }] = await db.select({ total: count() }).from(conversationsTable).where(eq(conversationsTable.ownerId, owner.id));
      [conversation] = await db.insert(conversationsTable).values({ ownerId: owner.id, guestSessionId, anonymousAlias: `Anonymous${Number(total) + 1}` }).returning();
    }

    await db.insert(messagesTable).values({ conversationId: conversation.id, senderId: null, body, imageUrl, isRead: false });
    res.status(201).json({ message: "Message sent anonymously" });
  }
);

// --- مسار الحذف الشامل (للأدمن) ---
router.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.id;

    // 1. مسح المنشورات
    await db.delete(postsTable).where(eq(postsTable.userId, userId));

    // 2. مسح الرسائل
    await db.delete(messagesTable).where(or(eq(messagesTable.senderId, userId), eq(messagesTable.receiverId, userId)));

    // 3. مسح المحادثات
    await db.delete(conversationsTable).where(or(eq(conversationsTable.userOneId, userId), eq(conversationsTable.userTwoId, userId)));

    // 4. مسح المستخدم
    await db.delete(usersTable).where(eq(usersTable.id, userId));

    res.status(200).json({ message: "تم حذف المستخدم وكافة بياناته بنجاح" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "حدث خطأ أثناء الحذف" });
  }
});

export default router;
