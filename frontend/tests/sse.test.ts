import { test } from "node:test";
import assert from "node:assert/strict";
import { readSSE } from "../src/utils/sse";

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
  const messages = [];
  for await (const message of readSSE(stream)) messages.push(message);
  return messages;
};

test("joins an event split across network chunks", async () => {
  const messages = await collect(streamOf("event: del", 'ta\ndata: {"text":"Hel', 'lo"}\n\n'));
  assert.deepEqual(messages, [{ event: "delta", data: '{"text":"Hello"}' }]);
});

test("reads several events from one chunk", async () => {
  const messages = await collect(streamOf("event: delta\ndata: a\n\nevent: done\ndata: {}\n\n"));
  assert.deepEqual(
    messages.map(message => message.event),
    ["delta", "done"],
  );
});

test("ignores comment lines (heartbeats)", async () => {
  const messages = await collect(streamOf(": ping\n\nevent: delta\ndata: x\n\n"));
  assert.equal(messages.length, 1);
});

test("keeps Vietnamese characters split between chunks", async () => {
  const bytes = new TextEncoder().encode('event: delta\ndata: {"text":"ngủ"}\n\n');
  const cut = bytes.length - 6; // inside the multi-byte "ủ"
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes.slice(0, cut));
      controller.enqueue(bytes.slice(cut));
      controller.close();
    },
  });
  const [message] = await collect(stream);
  assert.equal(JSON.parse(message.data).text, "ngủ");
});

test("an event without a name gets an empty event type", async () => {
  const messages = await collect(streamOf("data: no name\n\n"));
  assert.deepEqual(messages, [{ event: "", data: "no name" }]);
});
