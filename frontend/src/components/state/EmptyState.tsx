import { FC } from "react";

interface EmptyStateProps {
  title: string;
  message: string;
}

const EmptyState: FC<EmptyStateProps> = props => {
  const { title, message } = props;

  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-line px-4 py-8 text-center">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-muted">{message}</p>
    </div>
  );
};

export default EmptyState;
