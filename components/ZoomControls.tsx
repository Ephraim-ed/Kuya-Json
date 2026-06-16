"use client";

import { ZoomIn, ZoomOut } from "lucide-react";

interface Props {
  size: number;
  setSize: (n: number) => void;
  min?: number;
  max?: number;
  base?: number;
  className?: string;
}

/** Compact zoom control: − / current size (click to reset) / +. */
export default function ZoomControls({
  size,
  setSize,
  min = 9,
  max = 28,
  base = 13,
  className = "",
}: Props) {
  const btn =
    "flex h-6 w-6 items-center justify-center text-gray-400 transition-colors hover:bg-bg-softer hover:text-gray-200 disabled:pointer-events-none disabled:opacity-40";
  return (
    <div
      className={`inline-flex items-center overflow-hidden rounded-md border border-border bg-bg ${className}`}
    >
      <button
        className={btn}
        onClick={() => setSize(Math.max(min, size - 1))}
        disabled={size <= min}
        title="Zoom out"
      >
        <ZoomOut size={13} />
      </button>
      <button
        onClick={() => setSize(base)}
        title="Reset zoom"
        className="min-w-[30px] border-x border-border px-1 py-0.5 text-center text-[11px] tabular-nums text-gray-400 transition-colors hover:bg-bg-softer hover:text-gray-200"
      >
        {size}
      </button>
      <button
        className={btn}
        onClick={() => setSize(Math.min(max, size + 1))}
        disabled={size >= max}
        title="Zoom in"
      >
        <ZoomIn size={13} />
      </button>
    </div>
  );
}
