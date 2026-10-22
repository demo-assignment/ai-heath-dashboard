import { FC, SelectHTMLAttributes } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string; label: string }[];
}

// The native arrow sits against the border and looks different in every browser,
// so we hide it (appearance-none) and draw our own with room on the right.
const Select: FC<SelectProps> = props => {
  const { options, className = "", ...rest } = props;

  return (
    <div className="relative">
      <select
        {...rest}
        className={`block w-full cursor-pointer appearance-none rounded-2xl border border-line bg-white py-2 pl-3 pr-10 text-sm outline-none focus:border-brand ${className}`}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <svg
        viewBox="0 0 20 20"
        width={16}
        height={16}
        aria-hidden
        className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted"
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
    </div>
  );
};

export default Select;
