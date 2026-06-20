"use client";

import { useEffect, useRef, useState } from "react";
import { Settings } from "lucide-react";
import { Switch } from "./ui";
import type { Preferences as Prefs } from "@/lib/usePreferences";

interface Props {
  prefs: Prefs;
  setPref: <K extends keyof Prefs>(key: K, value: Prefs[K]) => void;
}

/** Header gear menu for global UI preferences. */
export default function Preferences({ prefs, setPref }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        title="Preferences"
        aria-label="Preferences"
        aria-expanded={open}
        className="flex h-8 items-center justify-center rounded-md border border-border px-2 text-gray-300 hover:bg-bg-softer"
      >
        <Settings size={15} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-40 mt-1 w-60 rounded-md border border-border bg-bg-soft p-2 shadow-lg">
          <div className="px-1 pb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
            Preferences
          </div>
          <div className="flex items-center justify-between gap-3 rounded px-1 py-1.5 hover:bg-bg-softer">
            <span className="text-sm text-gray-300">Vertical tabs</span>
            <Switch
              label=""
              checked={prefs.verticalTabs}
              onChange={(v) => setPref("verticalTabs", v)}
            />
          </div>
          <p className="px-1 pt-0.5 text-[11px] leading-snug text-gray-500">
            Move workspace tabs into the sidebar next to the tree.
          </p>
        </div>
      )}
    </div>
  );
}
