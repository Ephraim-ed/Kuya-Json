"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import KuyaSprite from "./KuyaSprite";
import { Button } from "./ui";

export default function ErrorScreen({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset?: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-bg px-6 text-center">
      <div
        className={`animate-kuya-pop flex w-full flex-col items-center transition-all ${
          open ? "max-w-2xl" : "max-w-md"
        }`}
      >
        <KuyaSprite size={120} mood="sad" />

        <h1 className="mt-3 text-xl font-semibold text-gray-100">
          Aray! Kuya needs to fix this.
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-400">
          Something went wrong while handling that. It&apos;s not you — Kuya tripped
          over some JSON. Please try again in a little while.
        </p>

        <div className="mt-4 flex items-center gap-2">
          {reset && (
            <Button variant="primary" onClick={reset}>
              Try again
            </Button>
          )}
          <Button onClick={() => location.reload()}>Reload</Button>
        </div>

        {/* Collapsible technical details */}
        <div className="mt-5 w-full text-left">
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300"
          >
            <ChevronRight
              size={13}
              className={`transition-transform ${open ? "rotate-90" : ""}`}
            />
            {open ? "Hide" : "Show"} error details
          </button>
          {open && (
            <pre className="mt-2 max-h-96 min-h-48 overflow-auto rounded-md border border-border bg-bg-soft p-3 text-left font-mono text-[11px] leading-relaxed text-red-300">
              {error?.message || "Unknown error"}
              {error?.digest ? `\n\ndigest: ${error.digest}` : ""}
              {error?.stack ? `\n\n${error.stack}` : ""}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
