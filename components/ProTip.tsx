"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import KuyaSprite from "./KuyaSprite";

const KEY = "kuya-json:protip-comments";

/** A bottom-left Kuya Json badge with a dismissible "pro tip" callout. */
export default function ProTip() {
  const [showTip, setShowTip] = useState(false);

  useEffect(() => {
    setShowTip(localStorage.getItem(KEY) !== "1");
  }, []);

  function dismiss() {
    setShowTip(false);
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="pointer-events-none fixed bottom-3 left-3 z-30 flex items-end gap-2">
      {showTip && (
        <div className="animate-kuya-pop pointer-events-auto relative max-w-[260px] rounded-lg border border-border bg-bg-soft px-3 py-2 pr-7 shadow-lg">
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
              <span className="font-semibold text-blue-500">Pro tip:</span> you can
              add comments with{" "}
              <code className="rounded bg-bg px-1 font-mono text-[11px] text-accent">
                --
              </code>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
