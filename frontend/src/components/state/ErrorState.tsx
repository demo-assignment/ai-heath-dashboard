import { FC } from "react";
import Mascot from "../mascot/Mascot";

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

const ErrorState: FC<ErrorStateProps> = props => {
  const { title = "Something went wrong", message, onRetry } = props;

  return (
    <div
      role="alert"
      className="mx-auto flex max-w-md flex-col items-center rounded-[28px] bg-white/80 p-8 text-center shadow-sm"
    >
      <Mascot mood="concerned" size={96} />
      <h2 className="mt-3 font-display text-xl font-bold">{title}</h2>
      <p className="mt-1 text-sm text-muted">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-5 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand"
        >
          Try again
        </button>
      )}
    </div>
  );
};

export default ErrorState;
