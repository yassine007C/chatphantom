import { Router, type IRouter } from "express";
import { db, conversationsTable, messagesTable } from "@workspace/db";
import { eq, desc, count, and, sql, inArray } from "drizzle-orm";
import { ReplyToConversationBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { filterContent } from "../lib/contentFilter";

const router: IRouter = Router();

// مسار عدد الرسائل غير المقروءة (تم تحسينه ليكون استعلاماً واحداً سريعا جداً)
router.get("/inbox/unread-count", requireAuth, async (req, res) => {
  const user = (req as any).user;

  const [{ cnt }] = await db
    .select({ cnt: count() })
    .from(messagesTable)
    .innerJoin(conversationsTable, eq(messagesTable.conversationId, conversationsTable.id))
    .where(
      and(
        eq(conversationsTable.ownerId, user.userId),
        eq(messagesTable.isRead, false),
        sql`${messagesTable.senderId} IS NULL`
      )
    );

  res.json({ count: Number(cnt) });
});

// مسار صندوق الوارد (تم حل مشكلة الاختناق والـ Timeout بالكامل عبر استعلام مجمع واستخدام الـ Pool)
router.get("/inbox", requireAuth, async (req, res) => {
  const user = (req as any).user;

  // 1. جلب كل المحادثات الخاصة بالمستخدم
  const conversations = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.ownerId, user.userId))
    .orderBy(desc(conversationsTable.createdAt));

  // إذا لم يكن هناك أي محادثات، نرجع مصفوفة فارغة فوراً ونختصر الوقت
  if (conversations.length === 0) {
    res.json({ conversations: [] });
    return;
  }

  // استخراج المصفوفة التي تحتوي على IDs لكل المحادثات
  const convIds = conversations.map(c => c.id);

  // 2. جلب عدادات الرسائل غير المقروءة لكل المحادثات دفعة واحدة (استعلام واحد بدلاً من الـ Loop)
  const unreadCounts = await db
    .select({
      conversationId: messagesTable.conversationId,
      unread: count()
    })
    .from(messagesTable)
    .where(
      and(
        inArray(messagesTable.conversationId, convIds),
        eq(messagesTable.isRead, false),
        sql`${messagesTable.senderId} IS NULL`
      )
    )
    .groupBy(messagesTable.conversationId);

  // تحويل مصفوفة العدادات إلى Map (قاموس سريع) ليسهل الوصول لكل محادثة بـ O(1)
  const unreadMap = Object.fromEntries(
    unreadCounts.map(item => [item.conversationId, Number(item.unread)])
  );

  // 3. جلب آخر رسالة لكل محادثة بشكل متزامن موازٍ ومحمي بالـ Pool الجديد
  const results = await Promise.all(
    conversations.map(async (conv) => {
      const [last] = await db
        .select()
        .from(messagesTable)
        .where(eq(messagesTable.conversationId, conv.id))
        .orderBy(desc(messagesTable.createdAt))
        .limit(1);

      return {
        id: conv.id,
        guestSessionId: conv.guestSessionId,
        anonymousAlias: conv.anonymousAlias,
        lastMessage: last?.body ?? null,
        lastMessageAt: last?.createdAt ?? null,
        unreadCount: unreadMap[conv.id] || 0,
        createdAt: conv.createdAt,
      };
    })
  );

  res.json({ conversations: results });
});

router.get("/inbox/:conversationId", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const conversationId = parseInt(req.params.conversationId, 10);

  if (isNaN(conversationId)) {
    res.status(400).json({ error: "Invalid conversation ID" });
    return;
  }

  const [conv] = await db
    .select()
    .from(conversationsTable)
    .where(
      and(
        eq(conversationsTable.id, conversationId),
        eq(conversationsTable.ownerId, user.userId)
      )
    )
    .limit(1);

  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const msgs = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, conv.id))
    .orderBy(messagesTable.createdAt);

  await db
    .update(messagesTable)
    .set({ isRead: true })
    .where(
      and(
        eq(messagesTable.conversationId, conv.id),
        eq(messagesTable.isRead, false),
        sql`${messagesTable.senderId} IS NULL`
      )
    );

  const [{ unread }] = await db
    .select({ unread: count() })
    .from(messagesTable)
    .where(
      and(
        eq(messagesTable.conversationId, conv.id),
        eq(messagesTable.isRead, false)
      )
    );

  const messages = msgs.map((m) => ({
    id: m.id,
    conversationId: m.conversationId,
    body: m.body,
    imageUrl: m.imageUrl ?? null,
    isRead: m.isRead,
    isFromOwner: m.senderId !== null,
    createdAt: m.createdAt,
  }));

  const [last] = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, conv.id))
    .orderBy(desc(messagesTable.createdAt))
    .limit(1);

  res.json({
    conversation: {
      id: conv.id,
      guestSessionId: conv.guestSessionId,
      anonymousAlias: conv.anonymousAlias,
      lastMessage: last?.body ?? null,
      lastMessageAt: last?.createdAt ?? null,
      unreadCount: Number(unread),
      createdAt: conv.createdAt,
    },
    messages,
  });
});

router.post("/inbox/:conversationId/reply", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const conversationId = parseInt(req.params.conversationId, 10);

  if (isNaN(conversationId)) {
    res.status(400).json({ error: "Invalid conversation ID" });
    return;
  }

  const [conv] = await db
    .select()
    .from(conversationsTable)
    .where(
      and(
        eq(conversationsTable.id, conversationId),
        eq(conversationsTable.ownerId, user.userId)
      )
    )
    .limit(1);

  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const parsed = ReplyToConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const body = filterContent(parsed.data.body);
  const imageUrl = (parsed.data as any).imageUrl ?? null;

  await db.insert(messagesTable).values({
    conversationId: conv.id,
    senderId: user.userId,
    body,
    imageUrl,
    isRead: true,
  });

  res.status(201).json({ message: "Reply sent" });
});

export default router;
