import { FC, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const Base: FC<IconProps> = ({ children, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    width={18}
    height={18}
    aria-hidden
    {...props}
  >
    {children}
  </svg>
);

export const FootIcon: FC<IconProps> = props => (
  <Base {...props}>
    <path d="M4 16v-2.4C4 11.5 3 10.5 3 8c0-2.7 1.5-6 4.5-6C9.4 2 10 3.8 10 5.5c0 3.1-2 5.7-2 8.7V16a2 2 0 1 1-4 0Z" />
    <path d="M20 20v-2.4c0-2.1 1-3.1 1-5.6 0-2.7-1.5-6-4.5-6C14.6 6 14 7.8 14 9.5c0 3.1 2 5.7 2 8.7V20a2 2 0 1 0 4 0Z" />
  </Base>
);

export const FlameIcon: FC<IconProps> = props => (
  <Base {...props}>
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3.3.3 1.4 1.4 2.8 2.5 2.8Z" />
  </Base>
);

export const MoonIcon: FC<IconProps> = props => (
  <Base {...props}>
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </Base>
);

export const LeafIcon: FC<IconProps> = props => (
  <Base {...props}>
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10Z" />
    <path d="M2 21c0-3 1.9-5.4 5.2-6" />
  </Base>
);

export const CloseIcon: FC<IconProps> = props => (
  <Base {...props}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Base>
);

export const SendIcon: FC<IconProps> = props => (
  <Base {...props}>
    <path d="m22 2-7 20-4-9-9-4Z" />
    <path d="M22 2 11 13" />
  </Base>
);

export const TrashIcon: FC<IconProps> = props => (
  <Base {...props}>
    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
  </Base>
);
