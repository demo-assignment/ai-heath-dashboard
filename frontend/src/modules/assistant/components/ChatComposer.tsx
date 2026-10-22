import { FC, FormEvent, KeyboardEvent, useEffect, useLayoutEffect, useRef, useState } from "react";
import { SendIcon } from "@/components/icons/Icons";
import { MAX_MESSAGE_LENGTH } from "../constants/suggestions.const";

interface ChatComposerProps {
  isStreaming: boolean;
  isOpen: boolean;
  isDisabled?: boolean;
  onSend: (text: string) => boolean;
  onStop: () => void;
}

const ChatComposer: FC<ChatComposerProps> = props => {
  const { isStreaming, isOpen, isDisabled = false, onSend, onStop } = props;
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isTooLong = value.length > MAX_MESSAGE_LENGTH;
  const canSend = !isStreaming && !isDisabled && !!value.trim() && !isTooLong;

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  useLayoutEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
  }, [value]);

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    if (!canSend) return;
    if (onSend(value)) setValue("");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // isComposing: Vietnamese/Japanese keyboards use Enter to confirm a character.
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) submit(event);
  };

  return (
    <form onSubmit={submit} className="shrink-0 border-t border-line p-3">
      <div className="flex items-end gap-2 rounded-3xl border border-line bg-white py-1.5 pl-4 pr-1.5 focus-within:border-brand">
        <textarea
          ref={inputRef}
          rows={1}
          disabled={isDisabled}
          value={value}
          onChange={event => setValue(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask Hearty about your health…"
          aria-label="Message"
          className="max-h-[120px] flex-1 resize-none bg-transparent py-1.5 text-sm leading-5 outline-none placeholder:text-muted"
        />
        {isStreaming ? (
          <button
            type="button"
            onClick={onStop}
            className="flex h-8 items-center gap-1.5 rounded-full bg-ink px-3.5 text-xs font-semibold text-white"
          >
            <span className="h-2 w-2 rounded-sm bg-white" /> Stop
          </button>
        ) : (
          <button
            type="submit"
            disabled={!canSend}
            aria-label="Send"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-white disabled:bg-slate-200 disabled:text-slate-400"
          >
            <SendIcon width={15} height={15} />
          </button>
        )}
      </div>
      <div className="mt-1.5 flex justify-between px-1 text-[11px] text-muted">
        <span>AI can make mistakes. Not medical advice.</span>
        <span className={isTooLong ? "font-semibold text-rose-600" : ""}>
          {value.length > MAX_MESSAGE_LENGTH * 0.8 ? `${value.length}/${MAX_MESSAGE_LENGTH}` : ""}
        </span>
      </div>
    </form>
  );
};

export default ChatComposer;
