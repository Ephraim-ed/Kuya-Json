"use client";

import { useTheme } from "./theme";

/** "Kuya" — a friendly mascot wearing a salakot. Sleeps in dark mode; can be sad. */
export default function KuyaSprite({
  size = 104,
  mood = "default",
}: {
  size?: number;
  mood?: "default" | "sad";
}) {
  const { theme } = useTheme();
  const sad = mood === "sad";
  const sleeping = theme === "dark" && !sad;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role="img"
      aria-label="Kuya mascot"
    >
      <ellipse cx="60" cy="112" rx="26" ry="5" fill="#000" opacity="0.15" />
      <g className="kuya-bob">
        {/* Body */}
        <rect x="30" y="48" width="60" height="56" rx="20" fill="#e0ac69" />
        <rect x="30" y="48" width="60" height="56" rx="20" fill="url(#kuyaShine)" />
        {/* Eyes — open & blinking when awake, closed when sleeping */}
        {sleeping ? (
          <g
            stroke="#0b1220"
            strokeWidth="2.6"
            strokeLinecap="round"
            fill="none"
          >
            <path d="M44 72 Q49 76 54 72" />
            <path d="M66 72 Q71 76 76 72" />
          </g>
        ) : (
          <g className={sad ? undefined : "kuya-eyes"}>
            <circle cx="49" cy="72" r="4.5" fill="#0b1220" />
            <circle cx="71" cy="72" r="4.5" fill="#0b1220" />
            <circle cx="50.6" cy="70.4" r="1.4" fill="#fff" />
            <circle cx="72.6" cy="70.4" r="1.4" fill="#fff" />
          </g>
        )}
        {/* Sad eyebrows + tear */}
        {sad && (
          <g stroke="#0b1220" strokeWidth="2.4" strokeLinecap="round" fill="none">
            <path d="M43 65 L53 68" />
            <path d="M77 65 L67 68" />
          </g>
        )}
        {sad && (
          <path d="M49 78 Q46 84 49 87 Q52 84 49 78 Z" fill="#6fb7f7" />
        )}
        {/* Mouth: smile, or frown when sad */}
        <path
          d={sad ? "M51 89 Q60 81 69 89" : "M51 83 Q60 91 69 83"}
          stroke="#0b1220"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="41" cy="80" r="3.5" fill="#ff8da1" opacity="0.7" />
        <circle cx="79" cy="80" r="3.5" fill="#ff8da1" opacity="0.7" />
        {/* Salakot hat */}
        <path d="M30 50 Q60 8 90 50 Z" fill="#2f81f7" />
        <path d="M30 50 Q60 8 90 50 Z" fill="url(#kuyaHatShine)" />
        {/* Logo on the hat */}
        <text
          x="60"
          y="41"
          textAnchor="middle"
          fontFamily="var(--font-mono), monospace"
          fontWeight="800"
          fontSize="9"
          fill="#fff"
        >
          {"{J}"}
        </text>
        <ellipse cx="60" cy="50" rx="33" ry="7" fill="#4493f8" />
        <ellipse
          cx="60"
          cy="49"
          rx="33"
          ry="6"
          fill="none"
          stroke="#1f6feb"
          strokeWidth="1"
        />
      </g>

      {/* Floating "z" while sleeping */}
      {sleeping && (
        <g fill="#93a4bd" fontFamily="var(--font-mono), monospace" fontWeight="700">
          <text className="kuya-z" x="90" y="46" fontSize="9" style={{ animationDelay: "1.4s" }}>
            z
          </text>
          <text className="kuya-z" x="97" y="36" fontSize="12" style={{ animationDelay: "0.7s" }}>
            z
          </text>
          <text className="kuya-z" x="105" y="26" fontSize="15">
            z
          </text>
        </g>
      )}

      <defs>
        <linearGradient id="kuyaShine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.25" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="kuyaHatShine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}
