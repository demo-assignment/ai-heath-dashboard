import { test } from "node:test";
import assert from "node:assert/strict";
import reducer, {
  activeConversationMissing,
  answerStarted,
  conversationCleared,
  conversationSelected,
  historyLoaded,
  newConversationSelected,
} from "../src/modules/assistant/assistantSlice";

const messages = [
  { id: "u1", role: "user" as const, content: "How is my sleep?", status: "done" as const },
  {
    id: "a1",
    role: "assistant" as const,
    content: "A saved answer",
    status: "done" as const,
    charts: [
      { type: "bar" as const, title: "Sleep", unit: "h", goal: 7.5, points: [{ date: "2026-10-18", value: 7 }] },
    ],
  },
];

test("selecting a conversation restores its messages and chart blocks", () => {
  const state = reducer(undefined, conversationSelected({ id: "conversation-1", messages }));
  assert.equal(state.activeId, "conversation-1");
  assert.deepEqual(state.messages, messages);
  assert.equal(state.messages[1].charts?.[0].title, "Sleep");
});

test("New chat resets the active history without deleting stored summaries", () => {
  let state = reducer(
    undefined,
    historyLoaded([
      { id: "old", title: "Old conversation", createdAt: "2026-10-22", updatedAt: "2026-10-22", messageCount: 2 },
    ]),
  );
  state = reducer(state, conversationSelected({ id: "old", messages }));
  state = reducer(state, newConversationSelected());
  assert.equal(state.activeId, null);
  assert.deepEqual(state.messages, []);
  assert.equal(state.conversations.length, 1);
  assert.equal(state.explicitNew, true);
});

test("logout/session expiry clears ids, history and messages and increments the reset token", () => {
  let state = reducer(undefined, conversationSelected({ id: "conversation-1", messages }));
  state = reducer(state, conversationCleared());
  assert.equal(state.activeId, null);
  assert.deepEqual(state.messages, []);
  assert.deepEqual(state.conversations, []);
  assert.equal(state.resetToken, 1);
});

test("a missing conversation ends the pending UI and requires an explicit new chat", () => {
  let state = reducer(undefined, answerStarted({ id: "pending" }));
  state = reducer(state, activeConversationMissing("Start a new chat."));
  assert.equal(state.isStreaming, false);
  assert.equal(state.activeId, null);
  assert.equal(state.activeError, "Start a new chat.");
});
