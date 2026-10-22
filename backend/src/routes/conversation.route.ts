import { Hono } from "hono";
import type { AuthEnv } from "../middlewares/auth.js";
import { rateLimit } from "../middlewares/rateLimit.js";
import { conversationStore } from "../data/conversationStore.js";
import {
  ConversationError,
  conversationSnapshot,
  createConversation,
  deleteConversation,
  findConversation,
} from "../services/conversation.service.js";

export const conversationRoute = new Hono<AuthEnv>();
conversationRoute.onError((error, c) => {
  if (error instanceof ConversationError)
    return c.json({ error: { code: error.code, message: error.message, retryable: error.retryable } }, error.status);
  console.error("[conversations]", error);
  return c.json(
    {
      error: {
        code: "HISTORY_UNAVAILABLE",
        message: "Couldn't access your conversation history. Please try again.",
        retryable: true,
      },
    },
    503,
  );
});

conversationRoute.get("/", async c => {
  const conversations = (await conversationStore.list(c.get("user").id))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map(({ id, title, createdAt, updatedAt, messages }) => ({
      id,
      title,
      createdAt,
      updatedAt,
      messageCount: messages.length,
    }));
  return c.json({ conversations });
});
conversationRoute.post("/", rateLimit, async c =>
  c.json({ conversation: await createConversation(c.get("user").id) }, 201),
);
conversationRoute.get("/:id", async c =>
  c.json({ conversation: conversationSnapshot(await findConversation(c.get("user").id, c.req.param("id"))) }),
);
conversationRoute.delete("/:id", rateLimit, async c => {
  await deleteConversation(c.get("user").id, c.req.param("id"));
  return c.json({ ok: true });
});
