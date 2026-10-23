import { FC, KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import WillRender from "../will-render/WillRender";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  id?: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

// The native option list can't be styled, so this draws its own listbox.
// Keyboard: Enter/Space/arrows open it, arrows move, Enter picks, Escape closes.
const Select: FC<SelectProps> = props => {
  const { id, value, options, onChange, className = "", disabled = false } = props;
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const selected = options.find(option => option.value === value);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [isOpen]);

  const open = () => {
    setActiveIndex(
      Math.max(
        options.findIndex(option => option.value === value),
        0,
      ),
    );
    setIsOpen(true);
  };

  const pick = (index: number) => {
    onChange(options[index].value);
    setIsOpen(false);
    buttonRef.current?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!isOpen) {
      if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(event.key)) {
        event.preventDefault();
        open();
      }
      return;
    }
    if (event.key === "Escape") {
      // keep Escape from also closing the modal around us
      event.preventDefault();
      event.stopPropagation();
      setIsOpen(false);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex(index => Math.min(index + 1, options.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex(index => Math.max(index - 1, 0));
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      setActiveIndex(event.key === "Home" ? 0 : options.length - 1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      pick(activeIndex);
    } else if (event.key === "Tab") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-activedescendant={isOpen ? `${listId}-${activeIndex}` : undefined}
        disabled={disabled}
        onClick={() => (isOpen ? setIsOpen(false) : open())}
        onKeyDown={onKeyDown}
        className={`flex w-full items-center justify-between rounded-2xl border bg-white py-2 pl-3 pr-3 text-left text-sm outline-none transition disabled:opacity-60 ${isOpen ? "border-brand ring-4 ring-brand/10" : "border-line focus:border-brand"}`}
      >
        <span className="truncate">{selected?.label ?? "Select…"}</span>
        <svg
          viewBox="0 0 20 20"
          width={16}
          height={16}
          aria-hidden
          className={`shrink-0 text-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
        >
          <path
            d="m5 7.5 5 5 5-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <WillRender when={isOpen}>
        <ul
          id={listId}
          role="listbox"
          aria-labelledby={id}
          className="absolute left-0 right-0 top-full z-20 mt-1.5 max-h-60 overflow-auto rounded-2xl border border-line bg-white p-1 shadow-xl shadow-emerald-950/10"
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            return (
              <li
                key={option.value}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={isSelected}
                onPointerEnter={() => setActiveIndex(index)}
                onClick={() => pick(index)}
                className={`flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-sm ${index === activeIndex ? "bg-canvas" : ""} ${isSelected ? "font-semibold text-brand" : "text-ink"}`}
              >
                {option.label}
                <WillRender when={isSelected}>
                  <svg viewBox="0 0 20 20" width={14} height={14} aria-hidden>
                    <path
                      d="m4.5 10.5 3.5 3.5 7.5-8"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </WillRender>
              </li>
            );
          })}
        </ul>
      </WillRender>
    </div>
  );
};

export default Select;
