import { test } from "node:test";
import assert from "node:assert/strict";
import { readChatStream, type LlmEvent } from "../services/llm.service.js";

const streamOf = (...parts: string[]) => {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      parts.forEach(part => controller.enqueue(encoder.encode(part)));
      controller.close();
    },
  });
};

const collect = async (stream: ReadableStream<Uint8Array>) => {
  const events: LlmEvent[] = [];
  for await (const event of readChatStream(stream)) events.push(event);
  return events;
};

test("joins text split across network chunks", async () => {
  const events = await collect(
    streamOf(
      'data: {"choices":[{"delta":{"content":"Hel',
      'lo"}}]}\n\ndata: {"choices":[{"delta":{"content":" there"},"finish_reason":"stop"}]}\n\n',
      "data: [DONE]\n\n",
    ),
  );
  assert.deepEqual(events, [
    { type: "text", text: "Hello" },
    { type: "text", text: " there" },
    { type: "finish", reason: "stop" },
  ]);
});

test("skips malformed chunks instead of crashing", async () => {
  const events = await collect(streamOf('data: {oops\n\ndata: {"choices":[{"delta":{"content":"ok"}}]}\n\n'));
  assert.deepEqual(events[0], { type: "text", text: "ok" });
});

test("throws when the provider sends an error object", async () => {
  await assert.rejects(collect(streamOf('data: {"error":{"message":"quota"}}\n\n')), /quota/);
});

test("ignores reasoning deltas and only keeps the answer", async () => {
  const events = await collect(
    streamOf(
      'data: {"choices":[{"delta":{"reasoning":"thinking..."}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"Answer"},"finish_reason":"stop"}]}\n\n',
    ),
  );
  assert.deepEqual(events, [
    { type: "text", text: "Answer" },
    { type: "finish", reason: "stop" },
  ]);
});

test("joins a tool call that arrives in pieces", async () => {
  const events = await collect(
    streamOf(
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_1","function":{"name":"get_daily_metrics","arguments":""}}]}}]}\n\n',
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"{\\"from\\":\\"2026-10-03\\","}}]}}]}\n\n',
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"\\"to\\":\\"2026-10-03\\"}"}}]},"finish_reason":"tool_calls"}]}\n\n',
    ),
  );
  assert.deepEqual(events, [
    {
      type: "tool_calls",
      calls: [{ id: "call_1", name: "get_daily_metrics", arguments: '{"from":"2026-10-03","to":"2026-10-03"}' }],
    },
    { type: "finish", reason: "tool_calls" },
  ]);
});
