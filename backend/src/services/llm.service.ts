import { createMockResponse } from "./mockLlm.js";
import type { LlmMessage } from "../types/chat.js";
import type { ToolCall } from "./tools.service.js";

export type LlmEvent =
  | { type: "text"; text: string }
  | { type: "tool_calls"; calls: ToolCall[] }
  | { type: "finish"; reason: string | null };

export class LlmError extends Error {
  code: string;
  retryable: boolean;
  status: number;

  constructor(message: string, code: string, retryable: boolean, status = 502) {
    super(message);
    this.code = code;
    this.retryable = retryable;
    this.status = status;
  }
}

const REQUEST_TIMEOUT_MS = 60_000;

// Both providers speak the OpenAI Chat Completions format, so switching is only a config change.
// Any other OpenAI-compatible API works by setting LLM_BASE_URL and LLM_MODEL directly.
const PROVIDERS = {
  groq: { baseUrl: "https://api.groq.com/openai/v1", model: "openai/gpt-oss-120b" },
  gemini: { baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", model: "gemini-flash-latest" },
};

type Provider = keyof typeof PROVIDERS;

export const getLlmConfig = () => {
  const provider =
    (process?.env?.LLM_PROVIDER as Provider) in PROVIDERS ? (process?.env?.LLM_PROVIDER as Provider) : "groq";
  const preset = PROVIDERS[provider];

  return {
    provider,
    apiKey: process?.env?.LLM_API_KEY || "",
    baseUrl: (process?.env?.LLM_BASE_URL || preset.baseUrl).replace(/\/$/, ""),
    model: process?.env?.LLM_MODEL || preset.model,
    reasoningEffort: process?.env?.LLM_REASONING_EFFORT || "",
    isMock: process?.env?.LLM_MOCK === "true",
  };
};

const getUpstreamError = (status: number) => {
  if (status === 401 || status === 403) {
    return new LlmError("The AI provider rejected the API key.", "LLM_AUTH_FAILED", false, 502);
  }
  if (status === 429) {
    return new LlmError(
      "The assistant is getting too many requests. Please try again in a minute.",
      "LLM_RATE_LIMITED",
      true,
      429,
    );
  }
  if (status === 400 || status === 404) {
    return new LlmError("The AI provider couldn't handle this request.", "LLM_BAD_REQUEST", false, 502);
  }
  return new LlmError("The AI provider is not available right now.", "LLM_UNAVAILABLE", true, 502);
};

interface StreamRequest {
  messages: LlmMessage[];
  signal: AbortSignal;
  tools?: unknown[];
  fetcher?: typeof fetch;
}

// Opens the stream first, so errors like a wrong API key can still be returned as a normal HTTP error
// before we start sending SSE to the browser.
export const requestChatStream = async ({ messages, signal, tools, fetcher }: StreamRequest) => {
  const config = getLlmConfig();
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const combinedSignal = AbortSignal.any([signal, timeout]);

  const body: Record<string, unknown> = {
    model: config.model,
    messages,
    stream: true,
    temperature: 0.3,
    // reasoning models (e.g. gpt-oss) also spend tokens on thinking, so leave some room
    max_tokens: 1500,
  };
  if (config.reasoningEffort) body.reasoning_effort = config.reasoningEffort;
  if (tools?.length) {
    body.tools = tools;
    body.tool_choice = "auto";
  }

  const send = fetcher || (config.isMock ? createMockResponse : fetch);

  let response: Response;
  try {
    response = await send(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` },
      body: JSON.stringify(body),
      signal: combinedSignal,
    });
  } catch (error) {
    if (timeout.aborted) throw new LlmError("The assistant took too long to respond.", "LLM_TIMEOUT", true, 504);
    throw error;
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error(`[llm] ${response.status} ${detail.slice(0, 300)}`);
    throw getUpstreamError(response.status);
  }
  if (!response.body) throw new LlmError("The AI provider returned no data.", "LLM_EMPTY_RESPONSE", true);

  return { body: response.body, timeout };
};

// Reads an OpenAI-style stream: lines of `data: {json}` and a final `data: [DONE]`.
// Tool calls arrive in pieces (name first, then the JSON arguments a few characters at a time),
// so we join them by `index` and only emit them once the stream is complete.
export async function* readChatStream(
  body: ReadableStream<Uint8Array>,
  timeout?: AbortSignal,
): AsyncGenerator<LlmEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finishReason: string | null = null;
  let skippedChunks = 0;
  const toolCalls = new Map<number, ToolCall>();

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (!data || data === "[DONE]") continue;

        let chunk: any;
        try {
          chunk = JSON.parse(data);
        } catch {
          skippedChunks += 1;
          continue;
        }

        if (chunk?.error) {
          throw new LlmError(
            chunk.error?.message || "The AI provider stopped with an error.",
            "LLM_STREAM_ERROR",
            true,
          );
        }

        const choice = chunk?.choices?.[0];
        // Only the answer text is shown. Reasoning models may also send `delta.reasoning`, which we skip.
        const text = choice?.delta?.content;
        if (typeof text === "string" && text) yield { type: "text", text };

        for (const part of choice?.delta?.tool_calls || []) {
          const index = typeof part?.index === "number" ? part.index : 0;
          const call = toolCalls.get(index) || { id: "", name: "", arguments: "" };
          if (part?.id) call.id = part.id;
          if (part?.function?.name) call.name = call.name || part.function.name;
          if (part?.function?.arguments) call.arguments += part.function.arguments;
          toolCalls.set(index, call);
        }

        if (choice?.finish_reason) finishReason = choice.finish_reason;
      }
    }
  } catch (error) {
    if (timeout?.aborted) throw new LlmError("The assistant took too long to respond.", "LLM_TIMEOUT", true, 504);
    throw error;
  } finally {
    reader.releaseLock();
  }

  if (skippedChunks) console.warn(`[llm] skipped ${skippedChunks} malformed chunks`);

  const calls = [...toolCalls.values()]
    .filter(call => call.name)
    .map((call, index) => ({ ...call, id: call.id || `call_${index}` }));
  if (calls.length) yield { type: "tool_calls", calls };

  yield { type: "finish", reason: finishReason };
}
