import { request } from "@/api/client";
import type { ChatMessage } from "@/types/chat";

export interface ConversationSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export const listConversations = () => request<{ conversations: ConversationSummary[] }>("/conversations");
export const createConversation = () =>
  request<{ conversation: Conversation }>("/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
export const getConversation = (id: string) =>
  request<{ conversation: Conversation }>(`/conversations/${encodeURIComponent(id)}`);
export const deleteConversation = (id: string) =>
  request<{ ok: true }>(`/conversations/${encodeURIComponent(id)}`, { method: "DELETE" });
