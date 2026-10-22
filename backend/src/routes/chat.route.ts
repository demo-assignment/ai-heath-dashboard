import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import type { AuthEnv } from "../middlewares/auth.js";
import { getHealthData } from "../data/index.js";
import { conversationStore, type Conversation, type StoredMessage } from "../data/conversationStore.js";
import { ConversationError, findConversation, finishTurn, prepareTurn } from "../services/conversation.service.js";
import { getDashboard } from "../services/insights.service.js";
import { getLlmConfig, LlmError, readChatStream, requestChatStream } from "../services/llm.service.js";
import { executeTool, getToolStatus, TOOL_DEFINITIONS, type ToolCall } from "../services/tools.service.js";
import { buildSystemPrompt } from "../prompts/healthAssistant.prompt.js";
import { findUnverifiedNumbers } from "../utils/grounding.js";
import { validateChatRequest } from "../utils/validateChat.js";
import { rateLimit } from "../middlewares/rateLimit.js";
import type { LlmMessage } from "../types/chat.js";

export const chatRoute = new Hono<AuthEnv>();
type StreamEventName = "status" | "delta" | "chart" | "meta" | "done" | "error";
const MAX_TOOL_ROUNDS = 3;
const toErrorBody = (error: unknown) => {
  if (error instanceof LlmError || error instanceof ConversationError)
    return { code: error.code, message: error.message, retryable: error.retryable };
  console.error("[chat]", error);
  return { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again.", retryable: true };
};

chatRoute.post("/", rateLimit, async c => {
  const body = await c.req.json().catch(() => null);
  const validation = validateChatRequest(body);
  if (!validation.ok)
    return c.json({ error: { code: "INVALID_REQUEST", message: validation.message, retryable: false } }, 400);
  const config = getLlmConfig();
  if (!config.apiKey && !config.isMock)
    return c.json(
      { error: { code: "LLM_NOT_CONFIGURED", message: "The assistant is not set up yet.", retryable: false } },
      503,
    );

  const owner = c.get("user").id;
  const id = validation.conversationId;
  const question = validation.message;
  let conversation: Conversation;
  let lock: string | null = null;
  try {
    await findConversation(owner, id);
    lock = await conversationStore.lock(owner, id);
    if (!lock)
      throw new ConversationError("This conversation is busy. Try again shortly.", "CONVERSATION_BUSY", 409, true);
    conversation = await findConversation(owner, id);
  } catch (error) {
    if (lock) await conversationStore.unlock(owner, id, lock).catch(() => {});
    return c.json({ error: toErrorBody(error) }, error instanceof ConversationError ? error.status : 503);
  }

  const unlock = () =>
    conversationStore.unlock(owner, id, lock!).catch(error => console.error("[conversation unlock]", error));
  const upstreamController = new AbortController();
  const onRequestAbort = () => upstreamController.abort();
  c.req.raw.signal?.addEventListener("abort", onRequestAbort);
  let assistant: StoredMessage | undefined;
  let upstream: Awaited<ReturnType<typeof requestChatStream>>;
  let data: Awaited<ReturnType<typeof getHealthData>>;
  let systemPrompt: string;
  let messages: LlmMessage[];
  try {
    const turn = prepareTurn(conversation, question, validation.regenerate);
    assistant = turn.assistant;
    await conversationStore.put(owner, conversation);
    // History and health context are both owned by the server, not supplied by the browser.
    data = await getHealthData();
    systemPrompt = buildSystemPrompt(getDashboard(data));
    messages = [{ role: "system", content: systemPrompt }, ...turn.history, { role: "user", content: question }];
    upstream = await requestChatStream({ messages, signal: upstreamController.signal, tools: TOOL_DEFINITIONS });
  } catch (error) {
    if (assistant) {
      assistant.status = upstreamController.signal.aborted ? "stopped" : "error";
      assistant.error = toErrorBody(error);
      await finishTurn(owner, conversation, assistant).catch(storageError =>
        console.error("[conversation save]", storageError),
      );
    }
    c.req.raw.signal?.removeEventListener("abort", onRequestAbort);
    await unlock();
    const status = error instanceof ConversationError ? error.status : error instanceof LlmError ? error.status : 503;
    return c.json({ error: toErrorBody(error) }, status as 400 | 404 | 409 | 422 | 429 | 500 | 502 | 503 | 504);
  }

  c.header("X-Accel-Buffering", "no");
  return streamSSE(c, async stream => {
    stream.onAbort(() => upstreamController.abort());
    const send = (event: StreamEventName, payload: Record<string, unknown> = {}) =>
      stream.writeSSE({ event, data: JSON.stringify({ type: event, ...payload }) });
    const answer = assistant!;
    let finished = false;
    let finishReason: string | null = null;
    let knownContext = `${systemPrompt}\n${question}`;
    const sources: string[] = [];
    try {
      for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
        if (round > 0)
          upstream = await requestChatStream({
            messages,
            signal: upstreamController.signal,
            tools: round < MAX_TOOL_ROUNDS ? TOOL_DEFINITIONS : undefined,
          });
        let roundText = "";
        let toolCalls: ToolCall[] = [];
        for await (const event of readChatStream(upstream.body, upstream.timeout)) {
          if (event.type === "text") {
            roundText += event.text;
            answer.content += event.text;
            await send("delta", { text: event.text });
          }
          if (event.type === "tool_calls") toolCalls = event.calls;
          if (event.type === "finish") finishReason = event.reason;
        }
        if (stream.aborted) return;
        if (!toolCalls.length) break;
        messages.push({
          role: "assistant",
          content: roundText || null,
          tool_calls: toolCalls.map(call => ({
            id: call.id,
            type: "function",
            function: { name: call.name, arguments: call.arguments },
          })),
        });
        for (const call of toolCalls) {
          await send("status", { label: getToolStatus(call) });
          const result = executeTool(call, data);
          const content = JSON.stringify(result.content);
          messages.push({ role: "tool", tool_call_id: call.id, content });
          knownContext += `\n${content}`;
          if (!("error" in result.content)) sources.push(result.label);
          if (result.chart) {
            answer.charts = [...(answer.charts || []), result.chart];
            await send("chart", { chart: result.chart });
          }
        }
      }
      if (stream.aborted) return;
      if (!answer.content.trim())
        throw new LlmError("The assistant returned an empty answer.", "LLM_EMPTY_RESPONSE", true);
      answer.meta = {
        truncated: finishReason === "length",
        filtered: finishReason === "content_filter",
        unverifiedNumbers: findUnverifiedNumbers(answer.content, knownContext),
        sources,
      };
      answer.status = "done";
      // Persist before done: a subsequent history request must see the completed answer.
      await finishTurn(owner, conversation, answer);
      finished = true;
      await send("meta", answer.meta);
      await send("done");
    } catch (error) {
      answer.status = stream.aborted || upstreamController.signal.aborted ? "stopped" : "error";
      if (answer.status === "error") answer.error = toErrorBody(error);
      if (!stream.aborted) await send("error", toErrorBody(error)).catch(() => {});
    } finally {
      if (!finished) {
        if (answer.status === "pending") answer.status = "stopped";
        await finishTurn(owner, conversation, answer).catch(error => console.error("[conversation save]", error));
      }
      c.req.raw.signal?.removeEventListener("abort", onRequestAbort);
      await unlock();
    }
  });
});
