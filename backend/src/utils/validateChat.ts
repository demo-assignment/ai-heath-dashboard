export const MAX_MESSAGE_LENGTH = 2000;
export const MAX_HISTORY = 12;

export const isConversationId = (id: unknown): id is string =>
  typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

type ValidationResult =
  { ok: true; conversationId: string; message: string; regenerate: boolean } | { ok: false; message: string };

export const validateChatRequest = (body: unknown): ValidationResult => {
  const value = body as Record<string, unknown> | null;
  if (
    !isConversationId(value?.conversationId) ||
    typeof value?.message !== "string" ||
    !value.message.trim() ||
    value.message.length > MAX_MESSAGE_LENGTH ||
    (value.regenerate !== undefined && typeof value.regenerate !== "boolean")
  ) {
    return { ok: false, message: "Send a conversationId and a message of up to 2000 characters." };
  }
  // Deliberately don't forward browser-supplied messages or system instructions.
  return {
    ok: true,
    conversationId: value.conversationId,
    message: value.message.trim(),
    regenerate: value.regenerate === true,
  };
};
