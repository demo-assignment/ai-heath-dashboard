import { FC } from "react";
import Mascot from "../mascot/Mascot";

const Block: FC<{ className: string }> = ({ className }) => (
  <div className={`animate-pulse rounded-[28px] bg-white/60 ${className}`} />
);

const DashboardSkeleton: FC = () => {
  return (
    <div aria-busy="true" aria-label="Loading your dashboard" className="space-y-5">
      <div className="flex items-center gap-3 text-sm font-semibold text-muted">
        <Mascot mood="thinking" size={44} />
        Hearty is getting your week ready…
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Block className="h-80 sm:col-span-2 xl:row-span-2 xl:h-auto" />
        <Block className="h-48" />
        <Block className="h-48 xl:row-span-2 xl:h-auto" />
        <Block className="h-48" />
        <Block className="h-44 sm:col-span-2" />
        <Block className="h-44" />
        <Block className="h-44" />
      </div>
    </div>
  );
};

export default DashboardSkeleton;
