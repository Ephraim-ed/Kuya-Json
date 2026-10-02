"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, MotionConfig } from "motion/react";
import { motionTokens, springs } from "@/lib/motion-tokens";
import { Sun, Moon } from "lucide-react";
import { Button } from "./ui";
import { useTheme } from "./theme";
import KuyaSprite from "./KuyaSprite";

interface Step {
  id: string;
  /** CSS selector of the element to spotlight; omit for a centered step. */
  target?: string;
  title: string;
  desc: string;
}

const STEPS: Step[] = [
  {
    id: "welcome",
    title: "Hi, I'm your Kuya Json! 👋",
    desc: "I'm your friendly JSON sidekick. I can format, validate, repair, explore, convert and tidy up your JSON — all right here in your browser, nothing ever uploaded. Come on, let me show you around!",
  },
  {
    id: "tool-format",
    target: '[data-tour="tool-format"]',
    title: "Format",
    desc: "Pretty-print, minify or sort keys — with optional auto Validate, Repair and Unescape.",
  },
  {
    id: "tool-anonymize",
    target: '[data-tour="tool-anonymize"]',
    title: "Anonymize",
    desc: "Mask sensitive data (emails, phones, cards, names…) with realistic fakes, masks, redaction or stable hashes.",
  },
  {
    id: "tool-convert",
    target: '[data-tour="tool-convert"]',
    title: "Convert",
    desc: "Turn JSON into YAML, XML, CSV, TypeScript, Go, Python or a JSON Schema.",
  },
  {
    id: "tool-diff",
    target: '[data-tour="tool-diff"]',
    title: "Diff",
    desc: "Compare two documents structurally — added, removed and changed values are highlighted.",
  },
  {
    id: "tool-schema",
    target: '[data-tour="tool-schema"]',
    title: "Schema",
    desc: "Generate a JSON Schema from the document, or validate it against a schema you paste in.",
  },
  {
    id: "tool-transform",
    target: '[data-tour="tool-transform"]',
    title: "Transform",
    desc: "Sort keys, flatten/unflatten dot-notation, or merge in a second document.",
  },
  {
    id: "sidebar",
    target: '[data-tour="sidebar"]',
    title: "Workspaces & Tree",
    desc: "Keep multiple documents in tabs (drag one onto another to group them into a folder), and browse structure in the tree.",
  },
  {
    id: "editor",
    target: '[data-tour="editor"]',
    title: "Your document",
    desc: "Paste JSON, drop a file, or start typing. Line comments with -- are supported.",
  },
  {
    id: "toolbar",
    target: '[data-tour="toolbar"]',
    title: "Toolbar",
    desc: "Format, minify and sort, and toggle auto Format / Validate / Repair / Unescape.",
  },
  {
    id: "console",
    target: '[data-tour="console"]',
    title: "Console & Output",
    desc: "Validation, repair messages and conversion output land here — click an error to jump to its line.",
  },
  {
    id: "settings",
    target: '[data-tour="settings"]',
    title: "Settings",
    desc: "Save & load, backups, vertical tabs, zen mode and the theme all live in this menu.",
  },
  {
    id: "zen",
    target: '[data-tour="settings"]',
    title: "Zen mode",
    desc: "Want fewer distractions? Turn on Zen mode for a stripped-down layout — sidebar and labels tucked away, a floating toolbar — so it's just you and the JSON.",
  },
  {
    id: "theme",
    title: "Day or night?",
    desc: "Pick a theme. Switch to day to wake Kuya up — or to night, and he'll fall asleep.",
  },
];

const CARD_W = 320;
const PAD = 8;

// Zen mode's Mincho face (loaded in layout.tsx) for the Zen step header.
const ZEN_FONT =
  'var(--font-zen-serif), "Hiragino Mincho ProN", "Yu Mincho", serif';

type CSSVars = CSSProperties & Record<`--${string}`, string | number>;

// Falling leaves for the Zen step: x position, fall duration, start offset,
// size, colour, peak opacity, spin range, and resting y (reduced motion).
const LEAVES: {
  x: string;
  d: number;
  delay: number;
  w: number;
  c: string;
  o: number;
  r0: number;
  r1: number;
  y: number;
}[] = [
  {
    x: "8%",
    d: 9,
    delay: -1,
    w: 22,
    c: "#6aa84f",
    o: 0.55,
    r0: -40,
    r1: 25,
    y: 18,
  },
  {
    x: "24%",
    d: 11,
    delay: -6,
    w: 16,
    c: "#8fbf6a",
    o: 0.45,
    r0: 20,
    r1: -35,
    y: 120,
  },
  {
    x: "41%",
    d: 8,
    delay: -3.5,
    w: 19,
    c: "#4f8a3c",
    o: 0.5,
    r0: -15,
    r1: 50,
    y: 64,
  },
  {
    x: "57%",
    d: 12,
    delay: -9,
    w: 14,
    c: "#a3c97f",
    o: 0.4,
    r0: 35,
    r1: -20,
    y: 150,
  },
  {
    x: "70%",
    d: 10,
    delay: -2,
    w: 20,
    c: "#6aa84f",
    o: 0.5,
    r0: -25,
    r1: 40,
    y: 40,
  },
  {
    x: "85%",
    d: 13,
    delay: -7.5,
    w: 15,
    c: "#8fbf6a",
    o: 0.45,
    r0: 10,
    r1: -45,
    y: 96,
  },
];

/** Decorative bamboo grove behind the Zen step card. */
function ZenBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl"
    >
      {/* Soft green wash rising from the bottom-right */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 100% 100%, rgba(106,168,79,0.16), transparent 60%)",
        }}
      />
      {/* 禅 (zen) watermark */}
      <span
        className="absolute -right-1 -top-3 select-none text-[88px] leading-none text-gray-100 opacity-[0.05]"
        style={{ fontFamily: ZEN_FONT }}
      >
        禅
      </span>
      {/* Bamboo stalks along the right edge */}
      <svg
        className="absolute bottom-0 right-2 h-full w-16 opacity-40"
        viewBox="0 0 64 240"
        preserveAspectRatio="xMaxYMax slice"
      >
        <g fill="#5b8c4a">
          <rect x="40" y="-10" width="7" height="260" rx="3.5" />
          <rect x="52" y="30" width="5" height="220" rx="2.5" />
        </g>
        <g stroke="#a3c97f" strokeWidth="2" strokeLinecap="round">
          <path d="M39 52 H48 M39 112 H48 M39 172 H48" />
          <path d="M51 86 H58 M51 150 H58 M51 214 H58" />
        </g>
        <g fill="#6aa84f">
          <path d="M40 112 C 30 104, 16 104, 4 108 C 16 112, 30 114, 40 112 Z" />
          <path d="M41 52 C 32 40, 22 34, 12 32 C 22 40, 30 48, 41 52 Z" />
          <path d="M52 150 C 46 160, 38 166, 26 170 C 36 162, 44 156, 52 150 Z" />
        </g>
      </svg>
      {/* Drifting leaves */}
      {LEAVES.map((l, n) => (
        <span
          key={n}
          className="zen-leaf"
          style={
            {
              "--x": l.x,
              "--d": `${l.d}s`,
              "--delay": `${l.delay}s`,
              "--o": l.o,
              "--r0": `${l.r0}deg`,
              "--r1": `${l.r1}deg`,
              "--rest-y": `${l.y}px`,
            } as CSSVars
          }
        >
          <svg width={l.w} height={l.w * 0.34} viewBox="0 0 24 8">
            <path
              d="M1 4 C 6 0.6, 16 0.4, 23 4 C 16 7.6, 6 7.4, 1 4 Z"
              fill={l.c}
            />
            <path
              d="M2.5 4 H21"
              stroke="rgba(0,0,0,0.18)"
              strokeWidth="0.6"
              strokeLinecap="round"
            />
          </svg>
        </span>
      ))}
    </div>
  );
}

export default function Tour({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const step = STEPS[i];
  const isLast = i === STEPS.length - 1;

  useEffect(() => {
    if (open) setI(0);
  }, [open]);

  // Measure the current target, re-measuring on layout changes.
  useLayoutEffect(() => {
    if (!open) return;
    let raf = 0;
    const measure = () => {
      const sel = STEPS[i].target;
      if (!sel) return setRect(null);
      const el = document.querySelector(sel);
      if (!el) return setRect(null);
      el.scrollIntoView({ block: "nearest", inline: "nearest" });
      setRect(el.getBoundingClientRect());
    };
    measure();
    const onWin = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };
    window.addEventListener("resize", onWin);
    window.addEventListener("scroll", onWin, true);
    return () => {
      window.removeEventListener("resize", onWin);
      window.removeEventListener("scroll", onWin, true);
      cancelAnimationFrame(raf);
    };
  }, [open, i]);

  const next = () => (isLast ? onClose() : setI((n) => n + 1));
  const back = () => setI((n) => Math.max(0, n - 1));

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isLast]);

  // Position the coachmark near the target (or centered when there is none).
  // `centered` steps use a flex wrapper (CSS transform centering would be
  // clobbered by motion's animated transform).
  const placement = useMemo<{ centered: boolean; style: CSSProperties }>(() => {
    if (typeof window === "undefined" || !rect) {
      return { centered: true, style: {} };
    }
    const m = 14;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const spaceBelow = vh - rect.bottom;
    const spaceAbove = rect.top;
    const tall = rect.height > vh * 0.6;
    const wide = rect.width > vw * 0.6;

    // A target that dominates the screen (e.g. the editor) — center the card.
    if (tall && wide) return { centered: true, style: {} };

    // Tall narrow targets (e.g. the full-height sidebar) have no room above/
    // below — place the card to the side that has more room.
    if (tall || (spaceBelow < 230 && spaceAbove < 230)) {
      const onLeft = rect.left + rect.width / 2 < vw / 2;
      const rawLeft = onLeft ? rect.right + m : rect.left - CARD_W - m;
      const left = Math.min(Math.max(12, rawLeft), vw - CARD_W - 12);
      const top = Math.min(
        Math.max(12, rect.top + rect.height / 2 - 120),
        vh - 260,
      );
      return { centered: false, style: { left, top } };
    }

    const left = Math.min(
      Math.max(12, rect.left + rect.width / 2 - CARD_W / 2),
      vw - CARD_W - 12,
    );
    return {
      centered: false,
      style:
        spaceBelow > 230
          ? { left, top: rect.bottom + m }
          : { left, bottom: vh - rect.top + m },
    };
  }, [rect]);

  if (!open || typeof document === "undefined") return null;

  const zen = step.id === "zen";

  const cardContent = (
    <>
      {zen && <ZenBackdrop />}
      <div className="relative">
        {(step.id === "welcome" || step.id === "theme") && (
          <div className="mb-2 flex justify-center">
            <KuyaSprite />
          </div>
        )}
        <h2
          className="text-base font-semibold text-gray-100"
          style={zen ? { fontFamily: ZEN_FONT } : undefined}
        >
          {step.title}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-gray-400">
          {step.desc}
        </p>
        {step.id === "theme" && <DayNightToggle />}

        <div className="mt-4 flex justify-center gap-1.5">
          {STEPS.map((_, n) => (
            <span
              key={n}
              className={`h-1.5 rounded-full transition-all ${
                n === i ? "w-5 bg-accent" : "w-1.5 bg-border"
              }`}
            />
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={onClose}
            className="mr-auto px-1 text-xs text-gray-500 hover:text-gray-300"
          >
            Skip
          </button>
          {i > 0 && <Button onClick={back}>Back</Button>}
          <Button variant="primary" onClick={next}>
            {isLast ? "Get started" : "Next"}
          </Button>
        </div>
      </div>
    </>
  );

  return createPortal(
    <MotionConfig reducedMotion="user">
      <div
        className="fixed inset-0 z-[70]"
        role="dialog"
        aria-modal="true"
        aria-label="Kuya Json tour"
      >
        {/* Click-blocker: advances on click, keeps the app non-interactive. */}
        <div className="absolute inset-0" onClick={next} />

        {rect ? (
          <motion.div
            className="pointer-events-none absolute left-0 top-0"
            initial={false}
            // Position via transform; only the size animates as a layout property.
            animate={{
              x: rect.left - PAD,
              y: rect.top - PAD,
              width: rect.width + PAD * 2,
              height: rect.height + PAD * 2,
            }}
            transition={springs.snappy}
            style={{
              borderRadius: 10,
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.6)",
              outline: "2px solid rgba(255,255,255,0.25)",
            }}
          />
        ) : (
          <div className="pointer-events-none absolute inset-0 bg-black/60" />
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            style={placement.centered ? undefined : placement.style}
            className={
              placement.centered
                ? "pointer-events-none absolute inset-0 flex items-center justify-center p-4"
                : `pointer-events-auto absolute w-80 rounded-xl border bg-bg-soft p-4 shadow-2xl ${
                    zen ? "border-[#6aa84f]/40" : "border-border"
                  }`
            }
            initial={{
              opacity: 0,
              y: motionTokens.distance.sm,
              scale: motionTokens.scale.subtle,
            }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{
              opacity: 0,
              y: -motionTokens.distance.sm,
              scale: motionTokens.scale.subtle,
            }}
            transition={{
              duration: motionTokens.duration.fast,
              ease: motionTokens.easing.smooth,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {placement.centered ? (
              <div
                className={`pointer-events-auto relative w-80 rounded-xl border bg-bg-soft p-4 shadow-2xl ${
                  zen ? "border-[#6aa84f]/40" : "border-border"
                }`}
              >
                {cardContent}
              </div>
            ) : (
              cardContent
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </MotionConfig>,
    document.body,
  );
}

/** Day / Night theme picker for the final tour step. */
function DayNightToggle() {
  const { theme, toggle } = useTheme();
  const select = (mode: "light" | "dark") => {
    if (theme !== mode) toggle();
  };
  return (
    <div className="mt-3 flex justify-center gap-2">
      <button
        onClick={() => select("light")}
        className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors hover:bg-bg-softer ${
          theme === "light" ? "bg-bg-softer text-amber-600" : "text-gray-400"
        }`}
      >
        <Sun size={13} /> Day
      </button>
      <button
        onClick={() => select("dark")}
        className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors hover:bg-bg-softer ${
          theme === "dark" ? "bg-bg-softer text-accent-fg" : "text-gray-400"
        }`}
      >
        <Moon size={13} /> Night
      </button>
    </div>
  );
}
