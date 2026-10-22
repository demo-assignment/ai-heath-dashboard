import { FC, ReactNode } from "react";

interface WillRenderProps {
  when: boolean;
  children: ReactNode;
}

const WillRender: FC<WillRenderProps> = props => {
  const { when, children } = props;
  return when ? <>{children}</> : null;
};

export default WillRender;
