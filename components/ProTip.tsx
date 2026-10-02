"use client";

import { useEffect, useState, type ReactNode } from "react";
import { X, RefreshCw } from "lucide-react";
import KuyaSprite from "./KuyaSprite";

const KEY = "kuya-json:protip-dismissed";

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded bg-bg px-1 font-mono text-2xs text-accent-fg">
      {children}
    </kbd>
  );
}

function buildTips(mod: string): ReactNode[] {
  return [
    <>
      you can add comments with <Kbd>--</Kbd>
    </>,
    <>
      press <Kbd>{mod} /</Kbd> to comment or uncomment lines
    </>,
    <>
      press <Kbd>{mod} F</Kbd> to find in the document
    </>,
    <>
      press <Kbd>{mod} ⇧ F</Kbd> to search across all workspaces
    </>,
    <>
      drag a tab onto the editor to split, or onto another tab to group
    </>,
  ];
}

/** A bottom-left dismissible "pro tip" callout that cycles through tips. */
export default function ProTip() {
  const [shown, setShown] = useState(false);
  const [i, setI] = useState(0);
  const [tips, setTips] = useState<ReactNode[]>([]);

  useEffect(() => {
    const isMac =
      typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
    setTips(buildTips(isMac ? "⌘" : "Ctrl"));
    setI(Math.floor(Math.random() * 5)); // start on a random tip
    setShown(localStorage.getItem(KEY) !== "1");
  }, []);

  function dismiss() {
    setShown(false);
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
  }

  if (!shown || tips.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-3 left-3 z-30 flex items-end gap-2">
      <div className="animate-kuya-pop pointer-events-auto relative max-w-[280px] rounded-lg border border-border bg-bg-soft px-3 py-2 pr-7 shadow-lg">
        <button
          onClick={dismiss}
          title="Dismiss"
          aria-label="Dismiss tip"
          className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded text-gray-500 hover:bg-bg-softer hover:text-gray-200"
        >
          <X size={12} />
        </button>
        <div className="flex items-center gap-2">
          <KuyaSprite size={28} />
          <p className="text-xs leading-relaxed text-gray-300">
            <span className="font-semibold text-accent-fg">Pro tip:</span> {tips[i]}
          </p>
          <button
            onClick={() => setI((n) => (n + 1) % tips.length)}
            title="Another tip"
            aria-label="Another tip"
            className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center self-start rounded text-gray-500 hover:bg-bg-softer hover:text-gray-200"
          >
            <RefreshCw size={11} />
          </button>
        </div>
      </div>
    </div>
  );
}
