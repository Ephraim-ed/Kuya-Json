"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
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
    title: "Welcome to Kuya Json",
    desc: "A privacy-first JSON toolkit — everything runs in your browser, nothing is uploaded. Here's a quick tour.",
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

// Japanese serif stack for the Zen mode step header.
const ZEN_FONT =
  '"Hiragino Mincho ProN", "Yu Mincho", "YuMincho", "Noto Serif JP", serif';

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
  const cardStyle = useMemo<CSSProperties>(() => {
    if (typeof window === "undefined" || !rect) {
      return { left: "50%", top: "50%", transform: "translate(-50%, -50%)" };
    }
    const m = 14;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const spaceBelow = vh - rect.bottom;
    const spaceAbove = rect.top;
    const tall = rect.height > vh * 0.6;
    const wide = rect.width > vw * 0.6;

    // A target that dominates the screen (e.g. the editor) — center the card
    // over it; the spotlight already shows what's highlighted.
    if (tall && wide) {
      return { left: "50%", top: "50%", transform: "translate(-50%, -50%)" };
    }

    // Tall narrow targets (e.g. the full-height sidebar) have no room above/
    // below — place the card to the side that has more room.
    if (tall || (spaceBelow < 230 && spaceAbove < 230)) {
      const onLeft = rect.left + rect.width / 2 < vw / 2;
      const rawLeft = onLeft ? rect.right + m : rect.left - CARD_W - m;
      const left = Math.min(Math.max(12, rawLeft), vw - CARD_W - 12);
      const top = Math.min(Math.max(12, rect.top + rect.height / 2 - 120), vh - 260);
      return { left, top };
    }

    const left = Math.min(
      Math.max(12, rect.left + rect.width / 2 - CARD_W / 2),
      vw - CARD_W - 12,
    );
    return spaceBelow > 230
      ? { left, top: rect.bottom + m }
      : { left, bottom: vh - rect.top + m };
  }, [rect]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[70]">
      {/* Click-blocker: advances on click, keeps the app non-interactive. */}
      <div className="absolute inset-0" onClick={next} />

      {rect ? (
        <motion.div
          className="pointer-events-none absolute"
          initial={false}
          animate={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
          }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
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
          style={cardStyle}
          className="pointer-events-auto absolute w-80 rounded-xl border border-border bg-bg-soft p-4 shadow-2xl"
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.18 }}
          onClick={(e) => e.stopPropagation()}
        >
          {(step.id === "welcome" || step.id === "theme") && (
            <div className="mb-2 flex justify-center">
              <KuyaSprite />
            </div>
          )}
          <h2
            className="text-base font-semibold text-gray-100"
            style={step.id === "zen" ? { fontFamily: ZEN_FONT } : undefined}
          >
            {step.title}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-gray-400">{step.desc}</p>
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
        </motion.div>
      </AnimatePresence>
    </div>,
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
          theme === "dark" ? "bg-bg-softer text-blue-500" : "text-gray-400"
        }`}
      >
        <Moon size={13} /> Night
      </button>
    </div>
  );
}
