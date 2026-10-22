import { FC, ReactNode } from "react";

interface CardProps {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
  // dark cards (e.g. sleep) flip the text colours
  isDark?: boolean;
  children: ReactNode;
}

const Card: FC<CardProps> = props => {
  const { title, subtitle, action, className = "", isDark = false, children } = props;

  return (
    <section
      className={`rounded-[28px] p-5 sm:p-6 ${isDark ? "bg-night text-white" : "border border-white/70 bg-white/80 shadow-[0_1px_2px_rgba(20,33,28,0.04),0_12px_32px_-12px_rgba(20,33,28,0.12)] backdrop-blur"} ${className}`}
    >
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h2 className="font-display text-lg font-bold tracking-tight">{title}</h2>}
            {subtitle && <p className={`mt-0.5 text-sm ${isDark ? "text-indigo-200" : "text-muted"}`}>{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
};

export default Card;
