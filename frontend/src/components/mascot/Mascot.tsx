import { FC, useId } from "react";

export type MascotMood = "happy" | "proud" | "sleepy" | "thinking" | "concerned" | "waving";

interface MascotProps {
  mood?: MascotMood;
  size?: number;
  className?: string;
  // the mascot is decorative by default; pass a label when it carries meaning
  label?: string;
}

const INK = "#3A1420";
const HEART_PATH =
  "M60 106C30 88 10 70 10 46c0-15 11-26 25-26 11 0 19 6 25 15 6-9 14-15 25-15 14 0 25 11 25 26 0 24-20 42-50 60Z";

const Eyes: FC<{ mood: MascotMood }> = ({ mood }) => {
  if (mood === "happy" || mood === "waving") {
    return (
      <g stroke={INK} strokeWidth={4.5} strokeLinecap="round" fill="none">
        <path d="M37 62c3-6 10-6 13 0" />
        <path d="M70 62c3-6 10-6 13 0" />
      </g>
    );
  }
  if (mood === "sleepy") {
    return (
      <g stroke={INK} strokeWidth={4.5} strokeLinecap="round">
        <path d="M37 62h13" />
        <path d="M70 62h13" />
      </g>
    );
  }

  const lookX = mood === "thinking" ? 4 : 0;
  const lookY = mood === "thinking" ? -4 : 0;

  return (
    <g className="mascot-eyes">
      <ellipse cx={44 + lookX} cy={61 + lookY} rx={6} ry={7.5} fill={INK} />
      <ellipse cx={76 + lookX} cy={61 + lookY} rx={6} ry={7.5} fill={INK} />
      <circle cx={46 + lookX} cy={58 + lookY} r={2.2} fill="#fff" />
      <circle cx={78 + lookX} cy={58 + lookY} r={2.2} fill="#fff" />
    </g>
  );
};

const Mouth: FC<{ mood: MascotMood }> = ({ mood }) => {
  switch (mood) {
    case "happy":
    case "waving":
      return <path d="M51 74c3 8 15 8 18 0Z" fill={INK} stroke={INK} strokeWidth={3} strokeLinejoin="round" />;
    case "proud":
      return <path d="M51 74c4 5 14 5 18 0" stroke={INK} strokeWidth={4} strokeLinecap="round" fill="none" />;
    case "thinking":
      return <ellipse cx={62} cy={77} rx={4} ry={3.5} fill={INK} />;
    case "concerned":
      return <path d="M52 79c4-4 12-4 16 0" stroke={INK} strokeWidth={4} strokeLinecap="round" fill="none" />;
    case "sleepy":
      return <ellipse cx={60} cy={77} rx={5} ry={3} fill={INK} />;
  }
};

// Hearty: a heart wearing a sports headband. Health + movement in one shape.
const Mascot: FC<MascotProps> = props => {
  const { mood = "happy", size = 96, className = "", label } = props;
  const id = useId().replace(/:/g, "");

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={`shrink-0 overflow-visible ${className}`}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <defs>
        <radialGradient id={`heart-${id}`} cx="35%" cy="30%" r="85%">
          <stop offset="0%" stopColor="#FFB3BF" />
          <stop offset="50%" stopColor="#FF6B81" />
          <stop offset="100%" stopColor="#E23D5B" />
        </radialGradient>
        <clipPath id={`clip-${id}`}>
          <path d={HEART_PATH} />
        </clipPath>
      </defs>

      <ellipse cx={60} cy={114} rx={28} ry={4} fill="#14211C" opacity={0.12} />

      <g className="mascot-body">
        <path
          d={mood === "waving" ? "M102 60c8-4 12-12 10-20" : "M100 66c7 2 11 8 9 14"}
          stroke="#E23D5B"
          strokeWidth={9}
          strokeLinecap="round"
          fill="none"
          className={mood === "waving" ? "mascot-arm-wave" : ""}
        />
        <path d="M20 66c-7 2-11 8-9 14" stroke="#E23D5B" strokeWidth={9} strokeLinecap="round" fill="none" />

        <path d={HEART_PATH} fill={`url(#heart-${id})`} />

        {/* headband */}
        <g clipPath={`url(#clip-${id})`}>
          <rect x={0} y={33} width={120} height={11} fill="#4ADE9B" />
          <rect x={0} y={36} width={120} height={3} fill="#fff" opacity={0.7} />
        </g>
        <g className="mascot-tails">
          <path d="M104 37c8-2 12 2 14 7" stroke="#4ADE9B" strokeWidth={5} strokeLinecap="round" fill="none" />
          <path d="M104 41c6 2 8 7 8 12" stroke="#22B377" strokeWidth={5} strokeLinecap="round" fill="none" />
        </g>

        <path d="M24 52c2-6 7-10 13-11" stroke="#fff" strokeWidth={4} strokeLinecap="round" opacity={0.6} fill="none" />

        {mood === "concerned" && (
          <g stroke={INK} strokeWidth={3.5} strokeLinecap="round">
            <path d="M36 50l11 3" />
            <path d="M84 50l-11 3" />
          </g>
        )}

        <Eyes mood={mood} />
        <ellipse cx={31} cy={71} rx={6.5} ry={4} fill="#fff" opacity={0.35} />
        <ellipse cx={89} cy={71} rx={6.5} ry={4} fill="#fff" opacity={0.35} />
        <Mouth mood={mood} />
      </g>

      {mood === "sleepy" && (
        <g fill="#14211C" fontFamily="var(--font-display)" fontWeight={800}>
          <text x={98} y={30} fontSize={16} className="mascot-z">
            z
          </text>
          <text x={106} y={18} fontSize={12} className="mascot-z mascot-z-2">
            z
          </text>
        </g>
      )}
      {mood === "thinking" && (
        <g fill="#14211C">
          <circle cx={100} cy={24} r={3.5} className="mascot-dot" />
          <circle cx={109} cy={16} r={3.5} className="mascot-dot" style={{ animationDelay: "0.2s" }} />
          <circle cx={117} cy={7} r={3.5} className="mascot-dot" style={{ animationDelay: "0.4s" }} />
        </g>
      )}
      {mood === "proud" && (
        <g fill="#FACC15">
          <path d="M104 16l2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5Z" className="twinkle" />
          <path
            d="M12 18l1.8 4 4 1.8-4 1.8-1.8 4-1.8-4-4-1.8 4-1.8Z"
            className="twinkle"
            style={{ animationDelay: "1s" }}
          />
        </g>
      )}
    </svg>
  );
};

export default Mascot;
