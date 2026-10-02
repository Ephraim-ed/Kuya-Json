/** The "Brace Buddy" mark — `{ }` with Kuya's eyes and smile. Inherits currentColor. */
export default function KuyaLogo({
  size = 16,
  strokeWidth = 7,
  className,
}: {
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="12 12 76 76"
      className={className}
      aria-hidden="true"
    >
      <KuyaLogoMark strokeWidth={strokeWidth} />
    </svg>
  );
}

/** The raw mark in a 0–100 coordinate space, for embedding inside another SVG. */
export function KuyaLogoMark({
  strokeWidth = 6,
  color = "currentColor",
}: {
  strokeWidth?: number;
  color?: string;
}) {
  return (
    <>
      <g
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M34,22 Q24,22 24,31.3 L24,42.5 Q24,50 16,50 Q24,50 24,57.5 L24,68.7 Q24,78 34,78" />
        <path d="M66,22 Q76,22 76,31.3 L76,42.5 Q76,50 84,50 Q76,50 76,57.5 L76,68.7 Q76,78 66,78" />
        <path d="M41,59 Q50,67 59,59" />
      </g>
      <circle cx="41" cy="44" r="4.5" fill={color} />
      <circle cx="59" cy="44" r="4.5" fill={color} />
    </>
  );
}
