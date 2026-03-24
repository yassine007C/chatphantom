import { Router, type IRouter } from "express";
import { db, usersTable, conversationsTable, messagesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { SendAnonymousMessageBody } from "@workspace/api-zod";
import { rateLimit } from "../middlewares/rateLimit";
import { filterContent } from "../lib/contentFilter";

const router: IRouter = Router();

router.get("/users", async (_req, res) => {
  const users = await db
    .select({ id: usersTable.id, username: usersTable.username, createdAt: usersTable.createdAt })
    .from(usersTable)
    .orderBy(usersTable.username);

  res.json({ users });
});

router.get("/users/:username", async (req, res) => {
  const { username } = req.params;
  const [user] = await db
    .select({ id: usersTable.id, username: usersTable.username, createdAt: usersTable.createdAt })
    .from(usersTable)
    .where(eq(usersTable.username, username))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(user);
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
      [conversation] = await db
        .insert(conversationsTable)
        .values({ ownerId: owner.id, guestSessionId })
        .returning();
    }

    await db.insert(messagesTable).values({
      conversationId: conversation.id,
      senderId: null,
      body,
      isRead: false,
    });

    res.status(201).json({ message: "Message sent anonymously" });
  }
);

export default router;
