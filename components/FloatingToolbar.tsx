"use client";

import { useRef, useState, type ReactNode } from "react";
import { GripVertical, Toolbox, ChevronLeft } from "lucide-react";

/**
 * A floating panel that hosts a tool's control bar in Zen mode. It can be dragged
 * by its grip handle and collapsed into a small toolbox icon. The panel is
 * anchored by its center so collapsing keeps it where the bar was centered.
 */
export default function FloatingToolbar({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const elRef = useRef<HTMLDivElement>(null);
  const draggedRef = useRef(false);

  function startDrag(e: React.PointerEvent) {
    const el = elRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx; // pointer offset from the center
    const dy = e.clientY - cy;
    const startX = e.clientX;
    const startY = e.clientY;
    draggedRef.current = false;

    const move = (ev: PointerEvent) => {
      if (
        Math.abs(ev.clientX - startX) > 3 ||
        Math.abs(ev.clientY - startY) > 3
      ) {
        draggedRef.current = true;
      }
      // Center-anchored, no clamping — may be dragged off-screen.
      setPos({ x: ev.clientX - dx, y: ev.clientY - dy });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  // Anchored by center; default sits at the bottom-center until dragged.
  const style: React.CSSProperties = pos
    ? { left: pos.x, top: pos.y, transform: "translate(-50%, -50%)" }
    : { left: "50%", bottom: 26, transform: "translateX(-50%)" };

  return (
    <div ref={elRef} style={style} className="fixed z-40 select-none">
      {collapsed ? (
        <button
          key="collapsed"
          onClick={() => {
            if (draggedRef.current) return; // a drag, not a click
            setCollapsed(false);
          }}
          onPointerDown={startDrag}
          title="Show toolbar"
          aria-label="Show toolbar"
          className="animate-kuya-pop flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-bg-soft text-gray-300 transition-transform hover:scale-105 hover:bg-bg-softer hover:text-gray-100 active:scale-95"
        >
          <Toolbox size={16} />
        </button>
      ) : (
        <div
          key="expanded"
          className="animate-kuya-pop inline-flex w-max items-stretch overflow-hidden whitespace-nowrap rounded-lg border border-border bg-bg-soft"
        >
          <div
            onPointerDown={startDrag}
            title="Drag to move"
            className="flex cursor-grab touch-none items-center border-r border-border px-1 text-gray-500 hover:text-gray-300 active:cursor-grabbing"
          >
            <GripVertical size={14} />
          </div>
          <div className="[&>*]:flex-nowrap [&>*]:border-b-0">{children}</div>
          <button
            onClick={() => setCollapsed(true)}
            title="Collapse toolbar"
            aria-label="Collapse toolbar"
            className="flex items-center border-l border-border px-1.5 text-gray-400 hover:bg-bg-softer hover:text-gray-200"
          >
            <ChevronLeft size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
