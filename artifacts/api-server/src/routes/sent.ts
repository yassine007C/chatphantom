import { Router, type IRouter } from "express";
import { db, conversationsTable, messagesTable } from "@workspace/db";
import { eq, desc, count, and, sql } from "drizzle-orm";
import { ReplyAsSenderBody } from "@workspace/api-zod";
import { filterContent } from "../lib/contentFilter";
import { rateLimit } from "../middlewares/rateLimit";

const router: IRouter = Router();

router.get("/sent", async (req, res) => {
  const guestSessionId = req.query.guestSessionId as string;
  if (!guestSessionId) {
    res.status(400).json({ error: "guestSessionId is required" });
    return;
  }

  const conversations = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.guestSessionId, guestSessionId))
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
            sql`${messagesTable.senderId} IS NOT NULL`
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

router.get("/sent/:conversationId", async (req, res) => {
  const conversationId = parseInt(req.params.conversationId, 10);
  const guestSessionId = req.query.guestSessionId as string;

  if (isNaN(conversationId) || !guestSessionId) {
    res.status(400).json({ error: "Invalid parameters" });
    return;
  }

  const [conv] = await db
    .select()
    .from(conversationsTable)
    .where(
      and(
        eq(conversationsTable.id, conversationId),
        eq(conversationsTable.guestSessionId, guestSessionId)
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
        sql`${messagesTable.senderId} IS NOT NULL`
      )
    );

  const messages = msgs.map((m) => ({
    id: m.id,
    conversationId: m.conversationId,
    body: m.body,
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

  const [{ unread }] = await db
    .select({ unread: count() })
    .from(messagesTable)
    .where(
      and(
        eq(messagesTable.conversationId, conv.id),
        eq(messagesTable.isRead, false)
      )
    );

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

router.post(
  "/sent/:conversationId/reply",
  rateLimit("send_message", 20, 60),
  async (req, res) => {
    const conversationId = parseInt(req.params.conversationId, 10);

    if (isNaN(conversationId)) {
      res.status(400).json({ error: "Invalid conversation ID" });
      return;
    }

    const parsed = ReplyAsSenderBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }

    const { guestSessionId, body: rawBody } = parsed.data;

    const [conv] = await db
      .select()
      .from(conversationsTable)
      .where(
        and(
          eq(conversationsTable.id, conversationId),
          eq(conversationsTable.guestSessionId, guestSessionId)
        )
      )
      .limit(1);

    if (!conv) {
      res.status(404).json({ error: "Conversation not found or unauthorized" });
      return;
    }

    const body = filterContent(rawBody);

    await db.insert(messagesTable).values({
      conversationId: conv.id,
      senderId: null,
      body,
      isRead: false,
    });

    res.status(201).json({ message: "Reply sent" });
  }
);

export default router;
