import { test } from "node:test";
import assert from "node:assert/strict";
import reducer, {
  answerChartReceived,
  answerChunkReceived,
  answerFailed,
  answerFinished,
  answerStarted,
  answerStatusChanged,
  answerStopped,
  userMessageAdded,
} from "../src/modules/assistant/assistantSlice";

const start = () => {
  let state = reducer(undefined, { type: "init" });
  state = reducer(state, userMessageAdded({ id: "q1", content: "How did I sleep?" }));
  return reducer(state, answerStarted({ id: "a1" }));
};

test("streams chunks into one answer", () => {
  let state = start();
  state = reducer(state, answerChunkReceived({ id: "a1", text: "You slept " }));
  state = reducer(state, answerChunkReceived({ id: "a1", text: "6 h." }));
  state = reducer(state, answerFinished({ id: "a1" }));
  const answer = state.messages[1];
  assert.equal(answer.content, "You slept 6 h.");
  assert.equal(answer.status, "done");
  assert.equal(state.isStreaming, false);
});

test("tool status shows until the next text arrives", () => {
  let state = start();
  state = reducer(state, answerStatusChanged({ id: "a1", label: "Looking up your daily data…" }));
  assert.equal(state.messages[1].statusText, "Looking up your daily data…");
  state = reducer(state, answerChunkReceived({ id: "a1", text: "On 3 Oct…" }));
  assert.equal(state.messages[1].statusText, undefined);
});

test("stop keeps the partial text", () => {
  let state = start();
  state = reducer(state, answerChunkReceived({ id: "a1", text: "Partial" }));
  state = reducer(state, answerStopped({ id: "a1" }));
  assert.equal(state.messages[1].status, "stopped");
  assert.equal(state.messages[1].content, "Partial");
  assert.equal(state.isStreaming, false);
});

test("an error is stored on the answer", () => {
  let state = start();
  state = reducer(
    state,
    answerFailed({ id: "a1", error: { code: "LLM_TIMEOUT", message: "Too slow", retryable: true } }),
  );
  assert.equal(state.messages[1].status, "error");
  assert.equal(state.messages[1].error?.code, "LLM_TIMEOUT");
});

test("chunks for an unknown answer are ignored", () => {
  const state = reducer(start(), answerChunkReceived({ id: "old-request", text: "late" }));
  assert.equal(state.messages[1].content, "");
});

test("charts are attached to the answer", () => {
  const chart = {
    type: "bar" as const,
    title: "Sleep",
    unit: "h",
    goal: 7.5,
    points: [{ date: "2026-10-18", value: 7.4 }],
  };
  const state = reducer(start(), answerChartReceived({ id: "a1", chart }));
  assert.deepEqual(state.messages[1].charts, [chart]);
});
