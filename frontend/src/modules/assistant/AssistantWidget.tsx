import { FC, useEffect, useRef, useState } from "react";
import { useAppDispatch } from "@/app/hooks";
import WillRender from "@/components/will-render/WillRender";
import Mascot from "@/components/mascot/Mascot";
import { CloseIcon, TrashIcon } from "@/components/icons/Icons";
import { assistantClosed, assistantToggled } from "./assistantSlice";
import { useChatStream } from "./hooks/useChatStream";
import { useStickToBottom } from "./hooks/useStickToBottom";
import ChatMessageItem from "./components/ChatMessageItem";
import ChatComposer from "./components/ChatComposer";
import SuggestedQuestions from "./components/SuggestedQuestions";

const AssistantWidget: FC = () => {
  const dispatch = useAppDispatch();
  const resetRef = useRef<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const loadedRef = useRef(false);
  const restoredRef = useRef(false);
  const {
    isOpen,
    messages,
    isStreaming,
    isBusy,
    conversations,
    historyStatus,
    historyError,
    activeId,
    activeError,
    explicitNew,
    resetToken,
    send,
    stop,
    retry,
    refreshHistory,
    selectConversation,
    createNew,
    removeConversation,
  } = useChatStream();
  const { ref: listRef, onScroll, scrollToBottom } = useStickToBottom<HTMLDivElement>(messages, messages.length > 0);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") dispatch(assistantClosed());
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, dispatch]);

  useEffect(() => {
    if (resetRef.current !== resetToken) {
      resetRef.current = resetToken;
      loadedRef.current = false;
      restoredRef.current = false;
    }
    if (isOpen && !loadedRef.current) {
      loadedRef.current = true;
      void refreshHistory();
    }
  }, [isOpen, refreshHistory, resetToken]);
  useEffect(() => {
    if (!isOpen || restoredRef.current || explicitNew || activeId || historyStatus !== "idle" || !conversations.length)
      return;
    restoredRef.current = true;
    void selectConversation(conversations[0].id);
  }, [isOpen, restoredRef, explicitNew, activeId, historyStatus, conversations, selectConversation]);

  const onSend = (text: string) => {
    const isSent = send(text);
    if (isSent) scrollToBottom();
    return isSent;
  };
  const lastMessage = messages[messages.length - 1];

  return (
    <>
      <WillRender when={isOpen}>
        <section
          role="dialog"
          aria-label="Health assistant"
          className="fixed inset-x-0 bottom-0 z-50 flex h-[85dvh] flex-col overflow-hidden rounded-t-[32px] border border-white bg-white shadow-2xl shadow-emerald-950/20 sm:inset-x-auto sm:bottom-28 sm:right-6 sm:h-[min(660px,calc(100dvh-9rem))] sm:w-[420px] sm:rounded-[32px]"
        >
          <header className="shrink-0 bg-gradient-to-r from-[#1f6f5c] to-[#185a4b] px-4 py-3 text-white">
            <div className="flex items-center gap-3">
              <span className="rounded-2xl bg-white/15 p-1">
                <Mascot mood={isStreaming ? "thinking" : "happy"} size={40} />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-lg font-bold leading-tight">Hearty</h2>
                <p className="truncate text-xs text-white/75">
                  {isStreaming ? "Thinking about your data…" : "Your health buddy · uses your data"}
                </p>
              </div>

              <button
                onClick={() => dispatch(assistantClosed())}
                aria-label="Close assistant"
                className="rounded-full p-2 text-white/80 hover:bg-white/15"
              >
                <CloseIcon />
              </button>
            </div>
            <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-white/15 pt-2.5">
              <span className="min-w-0 flex-1 truncate text-xs text-white/75">
                {isBusy ? "Loading…" : conversations.find(item => item.id === activeId)?.title || "New conversation"}
              </span>
              <button
                disabled={isStreaming || isBusy}
                onClick={createNew}
                className="shrink-0 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
              >
                New chat
              </button>
              <button
                disabled={isStreaming || isBusy}
                onClick={() => setShowHistory(value => !value)}
                className="shrink-0 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                aria-expanded={showHistory}
              >
                History
              </button>
            </div>
            <WillRender when={showHistory}>
              <div className="mt-3 max-h-40 overflow-y-auto rounded-2xl bg-white p-2 text-ink">
                <p className="px-2 py-1.5 text-[10px] text-muted">
                  Shared demo history. Please don't enter private health information.
                </p>
                {historyStatus === "loading" && <p className="px-2 py-3 text-xs text-muted">Loading history…</p>}
                {historyStatus === "error" && (
                  <div className="px-2 py-2 text-xs text-rose-700">
                    {historyError}{" "}
                    <button onClick={() => void refreshHistory()} className="font-semibold underline">
                      Retry
                    </button>
                  </div>
                )}
                {historyStatus === "idle" && !conversations.length && (
                  <p className="px-2 py-3 text-xs text-muted">No previous conversations yet.</p>
                )}
                {conversations.map(conversation => (
                  <div
                    key={conversation.id}
                    className={`flex items-center gap-1 rounded-xl px-2 py-1.5 ${activeId === conversation.id ? "bg-[#eaf6ef]" : "hover:bg-canvas"}`}
                  >
                    <button
                      disabled={isStreaming || isBusy}
                      onClick={() => {
                        void selectConversation(conversation.id);
                        setShowHistory(false);
                      }}
                      className="min-w-0 flex-1 text-left disabled:opacity-50"
                    >
                      <span className="block truncate text-xs font-semibold">
                        {conversation.title || "New conversation"}
                      </span>
                      <span className="block text-[10px] text-muted">
                        {new Date(conversation.updatedAt).toLocaleDateString()}
                      </span>
                    </button>
                    <button
                      disabled={isStreaming || isBusy}
                      onClick={() => void removeConversation(conversation.id)}
                      aria-label={`Delete ${conversation.title}`}
                      className="rounded p-1 text-muted hover:text-rose-700 disabled:opacity-50"
                    >
                      <TrashIcon width={14} height={14} />
                    </button>
                  </div>
                ))}
              </div>
            </WillRender>
          </header>
          <div
            ref={listRef}
            onScroll={onScroll}
            className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4"
            aria-live="off"
          >
            {historyError && !showHistory && (
              <div role="alert" className="rounded-xl bg-rose-50 p-3 text-xs text-rose-800">
                {historyError}{" "}
                <button className="font-semibold underline" onClick={() => void refreshHistory()}>
                  Retry history
                </button>
              </div>
            )}
            {activeError ? (
              <div role="alert" className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-800">
                {activeError}
                <button onClick={createNew} className="mt-2 block font-semibold underline">
                  New chat
                </button>
              </div>
            ) : messages.length ? (
              messages.map((message, index) => (
                <ChatMessageItem
                  key={message.id}
                  message={message}
                  onRetry={retry}
                  canRetry={index === messages.length - 1}
                />
              ))
            ) : (
              <SuggestedQuestions onSelect={onSend} />
            )}
          </div>
          <div className="sr-only" role="status" aria-live="polite">
            {isStreaming ? "Answering" : lastMessage?.status === "done" ? "Answer ready" : ""}
          </div>
          <ChatComposer
            isStreaming={isStreaming}
            isOpen={isOpen}
            isDisabled={isBusy || !!activeError || (historyStatus === "loading" && !activeId && !explicitNew)}
            onSend={onSend}
            onStop={stop}
          />
        </section>
      </WillRender>
      <button
        onClick={() => dispatch(assistantToggled())}
        aria-expanded={isOpen}
        aria-label={isOpen ? "Close health assistant" : "Open health assistant"}
        className={`group fixed bottom-6 right-6 z-50 items-center gap-2 rounded-full bg-ink py-2 pl-2 pr-5 text-sm font-semibold text-white shadow-xl shadow-emerald-950/25 transition hover:-translate-y-0.5 ${isOpen ? "hidden sm:flex" : "flex"}`}
      >
        <span className="rounded-full bg-white/10 p-0.5">
          {isOpen ? <CloseIcon className="m-2.5" /> : <Mascot mood="waving" size={40} />}
        </span>
        {isOpen ? "Close" : "Ask Hearty"}
      </button>
    </>
  );
};
export default AssistantWidget;
