import { test } from "node:test";
import assert from "node:assert/strict";
import { streamChat } from "../src/services/chat.service";
import type { StreamEvent } from "../src/types/chat";

const sseResponse = (body: string) =>
  new Response(new TextEncoder().encode(body), { status: 200, headers: { "Content-Type": "text/event-stream" } });

const run = async (body: string) => {
  globalThis.fetch = async () => sseResponse(body);
  const events: StreamEvent[] = [];
  await streamChat({
    conversationId: "conversation-1",
    message: "hi",
    signal: new AbortController().signal,
    onEvent: event => events.push(event),
  });
  return events;
};

test("posts only a conversation id and current message", async () => {
  let payload: unknown;
  globalThis.fetch = async (_url, init) => {
    payload = JSON.parse(String(init?.body));
    return sseResponse('event: done\ndata: {"type":"done"}\n\n');
  };
  await streamChat({
    conversationId: "conversation-1",
    message: "hi",
    regenerate: true,
    signal: new AbortController().signal,
    onEvent: () => undefined,
  });
  assert.deepEqual(payload, { conversationId: "conversation-1", message: "hi", regenerate: true });
});

test("only handles messages whose event name and data type agree, and ignores unknown types", async () => {
  const events = await run(
    [
      'data: {"type":"delta","text":"no event name"}',
      'event: delta\ndata: {"text":"no type inside"}',
      'event: delta\ndata: {"type":"status","text":"type does not match"}',
      'event: delta\ndata: {"type":"delta","text":"Hi"}',
      'event: table\ndata: {"type":"table","rows":[]}',
      'event: chart\ndata: {"type":"chart","chart":{"type":"bar","title":"Sleep","unit":"h","goal":7.5,"points":[]}}',
      'event: done\ndata: {"type":"done"}',
    ].join("\n\n") + "\n\n",
  );
  assert.deepEqual(
    events.map(event => event.type),
    ["delta", "chart", "done"],
  );
});

test("a stream without done is treated as interrupted", async () => {
  await assert.rejects(run('event: delta\ndata: {"type":"delta","text":"Hi"}\n\n'), /connection dropped/);
});

test("an error event stops the stream with the server message", async () => {
  await assert.rejects(
    run('event: error\ndata: {"type":"error","code":"LLM_TIMEOUT","message":"Too slow","retryable":true}\n\n'),
    /Too slow/,
  );
});
