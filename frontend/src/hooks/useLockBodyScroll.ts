import { useEffect } from "react";

// How many open modals want the page locked. Lets two modals overlap without unlocking too early.
let lockCount = 0;
let previous = { overflow: "", paddingRight: "" };

// While a modal is open, the page behind it shouldn't scroll. We also add padding equal to the
// scrollbar width, so the page doesn't jump sideways when the scrollbar disappears.
export const useLockBodyScroll = (isLocked = true) => {
  useEffect(() => {
    if (!isLocked) return;

    const { body, documentElement } = document;
    if (lockCount === 0) {
      previous = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
      const scrollbarWidth = window.innerWidth - documentElement.clientWidth;
      body.style.overflow = "hidden";
      if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
    }
    lockCount += 1;

    return () => {
      lockCount -= 1;
      if (lockCount === 0) {
        body.style.overflow = previous.overflow;
        body.style.paddingRight = previous.paddingRight;
      }
    };
  }, [isLocked]);
};
