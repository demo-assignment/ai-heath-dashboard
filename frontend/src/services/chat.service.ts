import { ApiError, notifyUnauthorized, toApiError } from "@/api/client";
import { API_BASE_URL, ENDPOINTS } from "@/api/endpoints";
import { readSSE } from "@/utils/sse";
import type { AnswerMeta, ChartBlock, StreamEvent } from "@/types/chat";

interface StreamChatParams {
  conversationId: string;
  message: string;
  regenerate?: boolean;
  signal: AbortSignal;
  onEvent: (event: StreamEvent) => void;
}

// One handler per event name. Events without a name, or with a name this version doesn't know,
// are ignored, so the server can add new block types without breaking older clients.
type Handler = (data: any, emit: (event: StreamEvent) => void) => void;

const isChart = (data: any): data is ChartBlock =>
  data?.type === "bar" && typeof data?.title === "string" && Array.isArray(data?.points);

const EVENT_HANDLERS: Record<string, Handler> = {
  status: (data, emit) => typeof data?.label === "string" && emit({ type: "status", label: data.label }),
  delta: (data, emit) => typeof data?.text === "string" && emit({ type: "delta", text: data.text }),
  chart: (data, emit) => isChart(data?.chart) && emit({ type: "chart", chart: data.chart }),
  meta: (data, emit) => data && emit({ type: "meta", meta: data as AnswerMeta }),
};

const parseJson = (data: string) => {
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
};

export const streamChat = async ({ conversationId, message, regenerate, signal, onEvent }: StreamChatParams) => {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${ENDPOINTS.chat}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify({ conversationId, message, ...(regenerate ? { regenerate: true } : {}) }),
      signal,
      credentials: "include",
    });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new ApiError("Can't reach the server. Please check your connection.", "NETWORK_ERROR", true);
  }

  // Errors before the stream starts come back as a normal JSON response.
  if (!response.ok) {
    if (response.status === 401) notifyUnauthorized();
    throw await toApiError(response);
  }
  if (!response.body) throw new ApiError("Streaming is not supported in this browser.", "NO_STREAM", false);

  let isDone = false;

  try {
    for await (const message of readSSE(response.body)) {
      if (signal.aborted) throw new DOMException("The user stopped the answer.", "AbortError");
      const data = parseJson(message.data);
      // the event name and the `type` inside the data must agree, otherwise the message is ignored
      if (!message.event || data?.type !== message.event) continue;

      // After the stream starts the status is already 200, so errors come as an event.
      if (message.event === "error") {
        throw new ApiError(
          data?.message || "The assistant stopped unexpectedly.",
          data?.code || "STREAM_ERROR",
          data?.retryable ?? true,
        );
      }
      if (message.event === "done") {
        isDone = true;
        onEvent({ type: "done" });
        continue;
      }
      EVENT_HANDLERS[message.event]?.(data, onEvent);
    }
  } catch (error) {
    if (signal.aborted || error instanceof ApiError) throw error;
    throw new ApiError("The connection dropped before the answer finished.", "STREAM_INTERRUPTED", true);
  }

  if (!isDone) throw new ApiError("The connection dropped before the answer finished.", "STREAM_INTERRUPTED", true);
};
