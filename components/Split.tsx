"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface Props {
  direction: "horizontal" | "vertical";
  /** Initial fraction (0–1) of the container given to the first pane. */
  initial?: number;
  min?: number;
  max?: number;
  /** Persist the chosen fraction across reloads. */
  storageKey?: string;
  /** Collapse the first pane (animated width → 0, gutter hidden). */
  collapsed?: boolean;
  first: ReactNode;
  second: ReactNode;
}

/**
 * A two-pane split with a draggable gutter. Pane sizes are stored as a fraction
 * of the container so they stay proportional on resize. Dependency-free.
 */
export default function Split({
  direction,
  initial = 0.5,
  min = 0.12,
  max = 0.88,
  storageKey,
  collapsed = false,
  first,
  second,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [frac, setFrac] = useState(initial);
  const [dragging, setDragging] = useState(false);
  const horizontal = direction === "horizontal";

  // Restore persisted size.
  useEffect(() => {
    if (!storageKey) return;
    const saved = localStorage.getItem(`split:${storageKey}`);
    if (saved) {
      const v = Number(saved);
      if (!Number.isNaN(v)) setFrac(Math.min(max, Math.max(min, v)));
    }
  }, [storageKey, min, max]);

  const onMove = useCallback(
    (clientX: number, clientY: number) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const raw = horizontal
        ? (clientX - rect.left) / rect.width
        : (clientY - rect.top) / rect.height;
      const next = Math.min(max, Math.max(min, raw));
      setFrac(next);
    },
    [horizontal, min, max],
  );

  useEffect(() => {
    if (!dragging) return;
    const move = (e: MouseEvent) => {
      e.preventDefault();
      onMove(e.clientX, e.clientY);
    };
    const touch = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) onMove(t.clientX, t.clientY);
    };
    const up = () => {
      setDragging(false);
      if (storageKey) localStorage.setItem(`split:${storageKey}`, String(frac));
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    window.addEventListener("touchmove", touch);
    window.addEventListener("touchend", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchmove", touch);
      window.removeEventListener("touchend", up);
    };
  }, [dragging, onMove, frac, storageKey]);

  return (
    <div
      ref={containerRef}
      className={`flex h-full w-full min-h-0 min-w-0 ${
        horizontal ? "flex-row" : "flex-col"
      } ${dragging ? "select-none" : ""}`}
    >
      <div
        className="min-h-0 min-w-0 overflow-hidden"
        style={{
          flexBasis: collapsed ? "0%" : `${frac * 100}%`,
          flexGrow: 0,
          flexShrink: 0,
          transition: dragging
            ? undefined
            : `flex-basis 250ms ease, opacity 250ms ease`,
          opacity: collapsed ? 0 : 1,
        }}
      >
        {first}
      </div>

      {!collapsed && (
        <div
          onMouseDown={() => setDragging(true)}
          onTouchStart={() => setDragging(true)}
          className={`group relative shrink-0 bg-border transition-colors hover:bg-accent ${
            horizontal ? "w-px cursor-col-resize" : "h-px cursor-row-resize"
          } ${dragging ? "bg-accent" : ""}`}
        >
          {/* Wider invisible hit area for easier grabbing. */}
          <div
            className={`absolute ${
              horizontal
                ? "inset-y-0 -left-1.5 -right-1.5 cursor-col-resize"
                : "inset-x-0 -top-1.5 -bottom-1.5 cursor-row-resize"
            }`}
          />
        </div>
      )}

      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">{second}</div>
    </div>
  );
}
