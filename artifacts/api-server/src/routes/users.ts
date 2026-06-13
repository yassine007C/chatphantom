import { Router, type IRouter } from "express";
import { db, usersTable, conversationsTable, messagesTable, postsTable } from "@workspace/db";
import { eq, or } from "drizzle-orm"; // قمنا بإضافة or للحذف الشامل
import { SendAnonymousMessageBody } from "@workspace/api-zod";
import { rateLimit } from "../middlewares/rateLimit";
import { filterContent } from "../lib/contentFilter";

const router: IRouter = Router();






const router = Router();

const router: IRouter = Router();

// مسار جلب قائمة المستخدمين (تمت إضافة حماية Limit لتجنب اختناق الذاكرة)
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
    .limit(100); // 👈 سقف آمن لمنع تعليق السيرفر

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
    const [owner] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.username, username))
      .limit(1);

    if (!owner) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const parsed = SendAnonymousMessageBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }

    const guestSessionId = parsed.data.guestSessionId || `guest_${Date.now()}`;
    const body = filterContent(parsed.data.body);
    const imageUrl = (parsed.data as any).imageUrl ?? null;

    let [conversation] = await db
      .select()
      .from(conversationsTable)
      .where(
        and(
          eq(conversationsTable.ownerId, owner.id),
          eq(conversationsTable.guestSessionId, guestSessionId)
        )
      )
      .limit(1);

    if (!conversation) {
      const [{ total }] = await db
        .select({ total: count() })
        .from(conversationsTable)
        .where(eq(conversationsTable.ownerId, owner.id));

      const aliasNumber = Number(total) + 1;
      const anonymousAlias = `Anonymous${aliasNumber}`;

      [conversation] = await db
        .insert(conversationsTable)
        .values({ ownerId: owner.id, guestSessionId, anonymousAlias })
        .returning();
    }

    await db.insert(messagesTable).values({
      conversationId: conversation.id,
      senderId: null,
      body,
      imageUrl,
      isRead: false,
    });

    res.status(201).json({ message: "Message sent anonymously" });
  }
);



router.delete("/users/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.id;

    // 1. مسح جميع منشورات المستخدم (Posts)
    // (استبدل 'authorId' أو 'userId' بالاسم الموجود لديك في جدول المنشورات)
    await db.delete(posts).where(eq(posts.authorId, userId));

    // 2. مسح جميع رسائل المستخدم (Messages) سواء كان هو المرسل أو المستقبل
    // (استبدل 'senderId' و 'receiverId' بالأسماء الموجودة لديك في جدول الرسائل)
    await db.delete(messages).where(
      or(
        eq(messages.senderId, userId),
        eq(messages.receiverId, userId)
      )
    );

    // 3. أخيراً: مسح حساب المستخدم نفسه بعد تنظيف كل بياناته
    await db.delete(users).where(eq(users.id, userId));

    res.status(200).json({ 
      message: "تم مسح المستخدم بنجاح مع كافة منشوراته ورسائله!" 
    });

  } catch (error) {
    console.error("خطأ أثناء حذف المستخدم وبياناته:", error);
    res.status(500).json({ error: "حدث خطأ داخلي أثناء محاولة الحذف الشامل" });
  }
});

export default router;
