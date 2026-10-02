"use client";

import { KuyaLogoMark } from "./KuyaLogo";
import { useTheme } from "./theme";

/**
 * "Kuya" — a friendly mascot in a Kuya JSON logo tee, holding a JSON laptop.
 * Sleeps (lying on a pillow) in dark mode; can be sad. Drawn on the 360×620 rig from
 * public/mascot/kuya/01-neutral.svg and cropped to a bust (or just the head
 * at small sizes, where the body would be unreadable).
 */
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
  const headOnly = size < 48;
  // At bust sizes he lies down to sleep; the tiny head just closes its eyes.
  const lying = sleeping && !headOnly;
  const limb = {
    fill: "none",
    strokeLinecap: "round",
    strokeLinejoin: "round",
  } as const;
  // Sad or sleeping Kuya lets his arm drop and puts the laptop away.
  const armDown = sad || lying;
  const farArm = armDown
    ? "M142,196 L132,252 L131,304"
    : "M146,192 L140,244 L108,250";
  const farSleeve = armDown ? "M142,196 L138,222" : "M146,192 L143,218";
  const farHand = armDown ? { cx: 131, cy: 313 } : { cx: 99, cy: 247 };

  return (
    <svg
      width={size}
      height={size}
      viewBox={headOnly ? "112 22 136 136" : "62 22 236 236"}
      role="img"
      aria-label="Kuya mascot"
    >
      {/* Pillow */}
      {lying && (
        <rect
          x="64"
          y="100"
          width="104"
          height="132"
          rx="30"
          fill="#E8EEF7"
          stroke="#C9D4E5"
          strokeWidth="3"
        />
      )}
      <g className="kuya-bob">
        <g
          transform={
            lying ? "translate(50 -14) rotate(-90 180 180)" : undefined
          }
        >
          {/* Logo tee */}
          <path
            d="M134,200 Q134,178 158,172 L202,172 Q226,178 226,200 L228,300 Q228,336 224,356 L136,356 Q132,336 132,300 Z"
            fill="#2F81F7"
          />
          <path
            d="M206,172 Q226,178 226,200 L228,300 Q228,336 224,356 L208,356 Q215,300 212,238 Q211,192 206,172 Z"
            fill="#1F6FEB"
            opacity="0.55"
          />
          <path
            d="M162,170 Q180,184 198,170 L198,178 Q180,192 162,178 Z"
            fill="#1F6FEB"
          />
          <rect x="162" y="192" width="36" height="36" rx="8" fill="#FFFFFF" />
          <g transform="translate(159 189) scale(0.42)">
            <KuyaLogoMark strokeWidth={8} color="#2F81F7" />
          </g>
          <text
            x="180"
            y="244"
            textAnchor="middle"
            fontFamily="var(--font-mono), monospace"
            fontWeight="800"
            fontSize="8"
            letterSpacing="1"
            fill="#FFFFFF"
          >
            KUYA JSON
          </text>

          {/* Far arm + short sleeve */}
          <path d={farArm} {...limb} stroke="#C48A4E" strokeWidth="25" />
          <path d={farArm} {...limb} stroke="#E0AC69" strokeWidth="20" />
          <path d={farSleeve} {...limb} stroke="#1A5FD0" strokeWidth="31" />
          <path d={farSleeve} {...limb} stroke="#2F81F7" strokeWidth="26" />
          <circle {...farHand} r="10.5" fill="#E0AC69" />

          {/* Laptop showing JSON */}
          {!armDown && (
            <g>
              <rect
                x="66"
                y="238"
                width="72"
                height="8"
                rx="3"
                fill="#34404F"
              />
              <rect
                x="70"
                y="184"
                width="64"
                height="54"
                rx="4"
                fill="#1C2430"
              />
              <rect
                x="75"
                y="189"
                width="54"
                height="44"
                rx="2"
                fill="#263142"
              />
              <path
                d="M84,195 Q80,195 80,199 L80,206 Q80,211 77,211 Q80,211 80,216 L80,223 Q80,227 84,227"
                {...limb}
                stroke="#4493F8"
                strokeWidth="2.6"
              />
              <rect
                x="88"
                y="202"
                width="14"
                height="3.5"
                rx="1.75"
                fill="#4493F8"
              />
              <rect
                x="105"
                y="202"
                width="16"
                height="3.5"
                rx="1.75"
                fill="#F2C14E"
              />
              <rect
                x="88"
                y="209"
                width="10"
                height="3.5"
                rx="1.75"
                fill="#4493F8"
              />
              <rect
                x="101"
                y="209"
                width="12"
                height="3.5"
                rx="1.75"
                fill="#93A4BD"
              />
              <rect
                x="88"
                y="216"
                width="18"
                height="3.5"
                rx="1.75"
                fill="#4493F8"
              />
              <rect
                x="109"
                y="216"
                width="10"
                height="3.5"
                rx="1.75"
                fill="#F2C14E"
              />
            </g>
          )}

          {/* Near arm + short sleeve */}
          <path
            d="M218,194 L232,250 L206,300"
            {...limb}
            stroke="#C48A4E"
            strokeWidth="25"
          />
          <path
            d="M218,194 L232,250 L206,300"
            {...limb}
            stroke="#E0AC69"
            strokeWidth="20"
          />
          <path
            d="M218,194 L224,220"
            {...limb}
            stroke="#1A5FD0"
            strokeWidth="31"
          />
          <path
            d="M218,194 L224,220"
            {...limb}
            stroke="#2F81F7"
            strokeWidth="26"
          />
          <circle cx="202" cy="306" r="10.5" fill="#E0AC69" />

          {/* Neck */}
          <rect x="169" y="138" width="22" height="38" fill="#E0AC69" />
          <rect x="169" y="138" width="22" height="12" fill="#C48A4E" />

          {/* Head */}
          <ellipse cx="137" cy="110" rx="7" ry="9" fill="#E0AC69" />
          <ellipse cx="223" cy="110" rx="7" ry="9" fill="#E0AC69" />
          <path
            d="M141,92 Q141,54 180,54 Q219,54 219,92 L219,118 Q219,152 180,152 Q141,152 141,118 Z"
            fill="#E0AC69"
          />
          <path
            d="M137,100 L137,84 Q137,52 150,42 Q160,30 180,31 Q202,27 214,39 Q224,48 223,84 L223,100 L211,100 L211,90 Q208,80 194,80 Q172,78 156,68 Q150,74 149,84 L149,100 Z"
            fill="#1E1A17"
          />
          <path
            d="M156,52 Q172,41 190,44"
            {...limb}
            stroke="#33302B"
            strokeWidth="4"
          />
          <path
            d="M164,63 Q180,53 198,57"
            {...limb}
            stroke="#33302B"
            strokeWidth="4"
          />
          {/* Brows tilt up in the middle when sad */}
          <rect
            x="150"
            y="86"
            width="22"
            height="5.5"
            rx="2.75"
            fill="#1E1A17"
            transform={`rotate(${sad ? -14 : -4} 161 88)`}
          />
          <rect
            x="188"
            y="86"
            width="22"
            height="5.5"
            rx="2.75"
            fill="#1E1A17"
            transform={`rotate(${sad ? 14 : 4} 199 88)`}
          />
          <circle cx="150" cy="124" r="6.5" fill="#FF8DA1" opacity="0.55" />
          <circle cx="210" cy="124" r="6.5" fill="#FF8DA1" opacity="0.55" />
          {/* Mouth: smile, or frown when sad */}
          <path
            d={sad ? "M170,139 Q180,130 190,139" : "M170,132 Q180,142 190,132"}
            fill="none"
            stroke="#6B3A22"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          <path
            d="M177,123 Q180,111 183,123 Q180,127 177,123 Z"
            fill="#C48A4E"
          />

          {/* Eyes — open & blinking when awake, closed when sleeping */}
          {sleeping ? (
            <g
              stroke="#0B1220"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
            >
              <path d="M157,107 Q163,113 169,107" />
              <path d="M191,107 Q197,113 203,107" />
            </g>
          ) : (
            <g className={sad ? undefined : "kuya-eyes"}>
              <circle cx="163" cy="108" r="5.5" fill="#0B1220" />
              <circle cx="197" cy="108" r="5.5" fill="#0B1220" />
              <circle cx="165" cy="106" r="1.8" fill="#FFFFFF" />
              <circle cx="199" cy="106" r="1.8" fill="#FFFFFF" />
            </g>
          )}
          {sad && (
            <path
              d="M157,116 Q153,124 157,128 Q161,124 157,116 Z"
              fill="#6FB7F7"
            />
          )}
        </g>
        {/* Blanket tucked up to his shoulders */}
        {lying && (
          <g>
            <rect
              x="228"
              y="92"
              width="96"
              height="152"
              rx="18"
              fill="#B8C4DA"
            />
            <rect
              x="228"
              y="92"
              width="18"
              height="152"
              rx="9"
              fill="#E8EEF7"
            />
            <path
              d="M268,104 Q262,168 270,232 M296,104 Q290,168 298,232"
              fill="none"
              stroke="#9AA8C2"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </g>
        )}
      </g>

      {/* Floating "z" while sleeping */}
      {sleeping && !headOnly && (
        <g
          fill="#93a4bd"
          fontFamily="var(--font-mono), monospace"
          fontWeight="700"
        >
          <text
            className="kuya-z"
            x="196"
            y="88"
            fontSize="18"
            style={{ animationDelay: "1.4s" }}
          >
            z
          </text>
          <text
            className="kuya-z"
            x="212"
            y="68"
            fontSize="22"
            style={{ animationDelay: "0.7s" }}
          >
            z
          </text>
          <text className="kuya-z" x="228" y="46" fontSize="26">
            z
          </text>
        </g>
      )}
    </svg>
  );
}
