import { FC, memo, useMemo } from "react";
import WillRender from "@/components/will-render/WillRender";
import Mascot from "@/components/mascot/Mascot";
import ChatChart from "./ChatChart";
import { renderMarkdown } from "../utils/renderMarkdown";
import type { ChatMessage } from "@/types/chat";

interface ChatMessageItemProps {
  message: ChatMessage;
  onRetry: (id: string) => void;
  canRetry: boolean;
}

// memo: while the last answer streams, older messages keep the same object and skip re-rendering.
const ChatMessageItem: FC<ChatMessageItemProps> = memo(props => {
  const { message, onRetry, canRetry } = props;
  const isStreaming = message.status === "streaming";
  const content = useMemo(() => renderMarkdown(message.content, isStreaming), [message.content, isStreaming]);

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap rounded-3xl rounded-br-md bg-ink px-4 py-2.5 text-sm text-white">
          {message.content}
        </p>
      </div>
    );
  }

  const { meta, error } = message;

  return (
    <div className="flex gap-2">
      <Mascot
        mood={
          message.status === "pending" || isStreaming ? "thinking" : message.status === "error" ? "concerned" : "happy"
        }
        size={34}
        className="mt-0.5"
      />
      <div className="min-w-0 max-w-[88%] space-y-2">
        <WillRender when={message.status === "pending" || !!message.statusText}>
          <div className="flex items-center gap-2 pt-2 text-sm text-muted">
            <span className="h-2 w-2 animate-pulse rounded-full bg-rose-400" />
            {message.statusText || "Looking at your data…"}
          </div>
        </WillRender>

        <WillRender when={!!message.content}>
          <div className="space-y-2 rounded-3xl rounded-tl-md bg-[#eaf6ef] px-4 py-3 text-sm leading-relaxed">
            {content}
            <WillRender when={isStreaming}>
              <span className="caret" aria-hidden />
            </WillRender>
          </div>
        </WillRender>

        {message.charts?.map((chart, index) => (
          <ChatChart key={index} chart={chart} />
        ))}

        <WillRender when={!!meta?.sources?.length && message.status === "done"}>
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
            <span>Looked up:</span>
            {meta?.sources?.map(source => (
              <span key={source} className="rounded-full bg-canvas px-2 py-0.5 font-semibold text-ink">
                {source}
              </span>
            ))}
          </div>
        </WillRender>

        <WillRender when={!!meta?.unverifiedNumbers?.length}>
          <p className="rounded-2xl bg-canvas px-3 py-2 text-[11px] leading-relaxed text-muted">
            <span className="font-semibold text-ink">Not from your data: {meta?.unverifiedNumbers.join(", ")}.</span>{" "}
            These may be general guidance. Check the dashboard for your own numbers.
          </p>
        </WillRender>

        <WillRender when={!!meta?.truncated}>
          <p className="text-xs text-muted">The answer was cut short. Ask a narrower question for the rest.</p>
        </WillRender>

        <WillRender when={message.status === "done" && canRetry}>
          <button onClick={() => onRetry(message.id)} className="text-xs font-semibold text-muted hover:text-brand">
            Regenerate
          </button>
        </WillRender>
        <WillRender when={message.status === "stopped"}>
          <p className="text-xs text-muted">
            Stopped.{" "}
            <WillRender when={canRetry}>
              <button onClick={() => onRetry(message.id)} className="font-semibold text-brand hover:underline">
                Regenerate
              </button>
            </WillRender>
          </p>
        </WillRender>

        <WillRender when={message.status === "error"}>
          <div role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {message.content ? "The answer was interrupted. " : ""}
            {error?.message}
            <WillRender when={!!error?.retryable && canRetry}>
              <button onClick={() => onRetry(message.id)} className="ml-2 font-semibold underline">
                Try again
              </button>
            </WillRender>
          </div>
        </WillRender>
      </div>
    </div>
  );
});

export default ChatMessageItem;
