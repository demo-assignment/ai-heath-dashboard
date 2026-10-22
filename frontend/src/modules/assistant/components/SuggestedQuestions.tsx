import { FC } from "react";
import Mascot from "@/components/mascot/Mascot";
import { useAppSelector } from "@/app/hooks";
import { SUGGESTED_QUESTIONS } from "../constants/suggestions.const";

interface SuggestedQuestionsProps {
  onSelect: (question: string) => void;
}

const SuggestedQuestions: FC<SuggestedQuestionsProps> = props => {
  const { onSelect } = props;
  const firstName = useAppSelector(state => state.dashboard.data?.persona.name.split(" ")[0]);

  return (
    <div className="flex min-h-full flex-col justify-end gap-5">
      <div className="flex shrink-0 flex-col items-center text-center">
        <Mascot mood="waving" size={110} />
        <p className="mt-2 font-display text-xl font-bold">Hi{firstName ? ` ${firstName}` : ""}, I'm Hearty!</p>
        <p className="mt-1 max-w-[280px] text-sm text-muted">
          Ask me anything about your activity, sleep, nutrition or weight. I only use what's on your dashboard.
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap justify-center gap-2">
        {SUGGESTED_QUESTIONS.map(question => (
          <button
            key={question}
            onClick={() => onSelect(question)}
            className="rounded-full border border-line bg-white px-3.5 py-2 text-left text-sm font-medium transition hover:-translate-y-0.5 hover:border-brand hover:text-brand"
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SuggestedQuestions;
