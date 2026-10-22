export type ChatRole = "user" | "assistant";

export type MessageStatus = "pending" | "streaming" | "done" | "stopped" | "error";

export interface ChatError {
  code: string;
  message: string;
  retryable: boolean;
}

export interface AnswerMeta {
  truncated: boolean;
  filtered: boolean;
  unverifiedNumbers: string[];
  // labels of the data the assistant looked up with tools, e.g. "Daily data, 3 Oct"
  sources?: string[];
}

// Extra UI inside an answer. Each kind has its own SSE event, so more can be added later (table, code...).
export interface ChartBlock {
  type: "bar";
  title: string;
  unit: string;
  goal: number | null;
  points: { date: string; value: number | null }[];
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  status: MessageStatus;
  error?: ChatError;
  meta?: AnswerMeta;
  // what the assistant is doing right now, e.g. "Looking up your daily data…"
  statusText?: string;
  charts?: ChartBlock[];
}

export type StreamEvent =
  | { type: "delta"; text: string }
  | { type: "status"; label: string }
  | { type: "chart"; chart: ChartBlock }
  | { type: "meta"; meta: AnswerMeta }
  | { type: "done" };
