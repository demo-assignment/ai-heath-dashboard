import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createConversation,
  deleteConversation,
  getConversation,
  listConversations,
} from "../src/services/conversation.service";

const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

test("conversation service uses owner-scoped conversation endpoints", async () => {
  const calls: { url: string; init?: RequestInit }[] = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return response({ conversations: [] });
  };
  await listConversations();
  await createConversation();
  await getConversation("a/b");
  await deleteConversation("a/b");
  assert.deepEqual(
    calls.map(call => call.url),
    ["/api/conversations", "/api/conversations", "/api/conversations/a%2Fb", "/api/conversations/a%2Fb"],
  );
  assert.equal(calls[1].init?.method, "POST");
  assert.equal(calls[3].init?.method, "DELETE");
});
