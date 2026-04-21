import { Router, type IRouter } from "express";
import { db, conversationsTable, messagesTable } from "@workspace/db";
import { eq, desc, count, and, sql } from "drizzle-orm";
import { ReplyToConversationBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { filterContent } from "../lib/contentFilter";

const router: IRouter = Router();

router.get("/inbox/unread-count", requireAuth, async (req, res) => {
  const user = (req as any).user;

  const convos = await db
    .select({ id: conversationsTable.id })
    .from(conversationsTable)
    .where(eq(conversationsTable.ownerId, user.userId));

  if (convos.length === 0) {
    res.json({ count: 0 });
    return;
  }

  const convoIds = convos.map((c) => c.id);
  const [{ cnt }] = await db
    .select({ cnt: count() })
    .from(messagesTable)
    .where(
      sql`${messagesTable.conversationId} = ANY(${sql.raw(`ARRAY[${convoIds.join(",")}]`)}) AND ${messagesTable.isRead} = false AND ${messagesTable.senderId} IS NULL`
    );

  res.json({ count: Number(cnt) });
});

router.get("/inbox", requireAuth, async (req, res) => {
  const user = (req as any).user;

  const conversations = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.ownerId, user.userId))
    .orderBy(desc(conversationsTable.createdAt));

  const results = await Promise.all(
    conversations.map(async (conv) => {
      const [last] = await db
        .select()
        .from(messagesTable)
        .where(eq(messagesTable.conversationId, conv.id))
        .orderBy(desc(messagesTable.createdAt))
        .limit(1);

      const [{ unread }] = await db
        .select({ unread: count() })
        .from(messagesTable)
        .where(
          and(
            eq(messagesTable.conversationId, conv.id),
            eq(messagesTable.isRead, false),
            sql`${messagesTable.senderId} IS NULL`
          )
        );

      return {
        id: conv.id,
        guestSessionId: conv.guestSessionId,
        anonymousAlias: conv.anonymousAlias,
        lastMessage: last?.body ?? null,
        lastMessageAt: last?.createdAt ?? null,
        unreadCount: Number(unread),
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
