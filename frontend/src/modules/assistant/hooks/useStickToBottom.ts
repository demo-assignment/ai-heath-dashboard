import { useCallback, useEffect, useRef } from "react";

// Follows new content only while the user is already at the bottom.
// If they scroll up to read, we leave them there.
export const useStickToBottom = <T extends HTMLElement>(dependency: unknown, followContent = true) => {
  const ref = useRef<T>(null);
  const isAtBottomRef = useRef(true);

  const onScroll = useCallback(() => {
    const element = ref.current;
    if (!element) return;
    isAtBottomRef.current = element.scrollHeight - element.scrollTop - element.clientHeight < 60;
  }, []);

  const scrollToBottom = useCallback(() => {
    const element = ref.current;
    if (!element) return;
    isAtBottomRef.current = true;
    element.scrollTop = element.scrollHeight;
  }, []);

  useEffect(() => {
    if (!followContent) {
      if (ref.current) ref.current.scrollTop = 0;
      isAtBottomRef.current = true;
      return;
    }
    if (isAtBottomRef.current) scrollToBottom();
  }, [dependency, followContent, scrollToBottom]);

  return { ref, onScroll, scrollToBottom };
};
