import { isConversationId, MAX_HISTORY } from "../utils/validateChat.js";
import { conversationStore, type Conversation, type StoredMessage } from "../data/conversationStore.js";

export class ConversationError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: 400 | 404 | 409 | 422,
    public retryable = false,
  ) {
    super(message);
  }
}
const now = () => new Date().toISOString();

export const findConversation = async (owner: string, id: string) => {
  if (!isConversationId(id)) throw new ConversationError("Invalid conversation ID.", "INVALID_CONVERSATION_ID", 400);
  const conversation = await conversationStore.get(owner, id);
  if (!conversation)
    throw new ConversationError("This conversation is no longer available.", "CONVERSATION_NOT_FOUND", 404);
  return conversation;
};

export const withConversationLock = async <T>(owner: string, id: string, run: () => Promise<T>) => {
  const token = await conversationStore.lock(owner, id);
  if (!token)
    throw new ConversationError("This conversation is busy. Try again shortly.", "CONVERSATION_BUSY", 409, true);
  try {
    return await run();
  } finally {
    await conversationStore.unlock(owner, id, token);
  }
};

export const createConversation = async (owner: string): Promise<Conversation> =>
  withConversationLock(owner, "create", async () => {
    if ((await conversationStore.list(owner)).length >= 20)
      throw new ConversationError(
        "You have 20 conversations. Delete one before starting another.",
        "CONVERSATION_LIMIT",
        422,
      );
    const timestamp = now();
    const conversation = {
      id: crypto.randomUUID(),
      title: "New conversation",
      createdAt: timestamp,
      updatedAt: timestamp,
      messages: [],
    };
    await conversationStore.put(owner, conversation);
    return conversation;
  });

export const deleteConversation = async (owner: string, id: string) => {
  await findConversation(owner, id);
  await withConversationLock(owner, id, async () => {
    await conversationStore.remove(owner, id);
  });
};

// A previous process may have died mid-stream. A loaded snapshot must not show an endless spinner.
export const conversationSnapshot = (conversation: Conversation): Conversation => ({
  ...conversation,
  messages: conversation.messages.map(message =>
    message.status === "pending" ? { ...message, status: "stopped" } : message,
  ),
});

export const conversationHistory = (conversation: Conversation) => {
  const history: { role: "user" | "assistant"; content: string }[] = [];
  for (let i = 0; i < conversation.messages.length - 1; i += 2) {
    const user = conversation.messages[i];
    const assistant = conversation.messages[i + 1];
    if (
      user.role === "user" &&
      assistant.role === "assistant" &&
      assistant.status === "done" &&
      assistant.content.trim()
    ) {
      history.push({ role: "user", content: user.content }, { role: "assistant", content: assistant.content });
    }
  }
  return history.slice(-MAX_HISTORY);
};

export const prepareTurn = (conversation: Conversation, message: string, regenerate: boolean) => {
  if (regenerate) {
    const previous = conversation.messages.at(-2);
    if (
      previous?.role !== "user" ||
      previous.content !== message ||
      conversation.messages.at(-1)?.role !== "assistant"
    ) {
      throw new ConversationError("Only the latest question can be regenerated.", "INVALID_REGENERATION", 409);
    }
    conversation.messages.splice(-2);
  }
  if (conversation.messages.length >= 100)
    throw new ConversationError("This conversation is full. Start a new chat.", "MESSAGE_LIMIT", 422);
  const history = conversationHistory(conversation);
  const timestamp = now();
  const user: StoredMessage = {
    id: crypto.randomUUID(),
    role: "user",
    content: message,
    status: "done",
    createdAt: timestamp,
  };
  const assistant: StoredMessage = {
    id: crypto.randomUUID(),
    role: "assistant",
    content: "",
    status: "pending",
    createdAt: timestamp,
  };
  conversation.messages.push(user, assistant);
  if (conversation.messages.length === 2) conversation.title = message.replace(/[\r\n\t]+/g, " ").slice(0, 60);
  conversation.updatedAt = timestamp;
  return { history, assistant };
};

export const finishTurn = async (owner: string, conversation: Conversation, assistant: StoredMessage) => {
  conversation.updatedAt = now();
  // Keep the public demo's storage bounded even when an upstream provider misbehaves.
  assistant.content = assistant.content.slice(0, 24_000);
  await conversationStore.put(owner, conversation);
};
