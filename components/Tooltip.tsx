"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useZen } from "./zen";

/** Wraps any element and shows a portalled tooltip on hover/focus. Portalled to
 *  <body> so it is never clipped by overflow-hidden ancestors. */
export default function Tooltip({
  text,
  children,
  width = 260,
}: {
  text: string;
  children: ReactNode;
  width?: number;
}) {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const zen = useZen();

  useLayoutEffect(() => {
    if (!show || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const left = Math.max(
      8,
      Math.min(r.left + r.width / 2 - width / 2, window.innerWidth - width - 8),
    );
    setPos({ top: r.bottom + 6, left });
  }, [show, width]);

  // Zen mode: render the element without any tooltip behavior.
  if (zen) return <span className="inline-flex">{children}</span>;

  return (
    <span
      ref={ref}
      className="inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      {children}
      {show &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="tooltip"
            style={{ position: "fixed", top: pos.top, left: pos.left, width }}
            className="pointer-events-none z-[100] rounded-md border border-border bg-bg-softer px-3 py-2 text-xs font-normal leading-relaxed text-gray-200 shadow-xl"
          >
            {text}
          </div>,
          document.body,
        )}
    </span>
  );
}
