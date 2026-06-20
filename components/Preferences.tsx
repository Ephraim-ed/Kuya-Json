"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Settings,
  Download,
  Upload,
  Sun,
  Moon,
  Archive,
  ArchiveRestore,
} from "lucide-react";
import { Switch } from "./ui";
import { useTheme } from "./theme";
import { useDocumentActions } from "./DocumentActions";
import { downloadText } from "@/lib/download";
import { loadState, saveState } from "@/lib/persist";
import type { Preferences as Prefs } from "@/lib/usePreferences";

interface Props {
  prefs: Prefs;
  setPref: <K extends keyof Prefs>(key: K, value: Prefs[K]) => void;
  /** Which edge the dropdown aligns to. Default "right". */
  align?: "left" | "right";
  /** Borderless, square trigger (for the zen sidebar). */
  bare?: boolean;
}

/** Header gear menu: File actions (save / load) and global UI preferences. */
export default function Preferences({
  prefs,
  setPref,
  align = "right",
  bare = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const backupRef = useRef<HTMLInputElement>(null);
  const doc = useDocumentActions();
  const { theme, toggle } = useTheme();
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Position the portalled menu relative to the trigger so it is never clipped
  // by the (overflow-hidden) sidebar in zen mode.
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const width = 240; // w-60
    const s: React.CSSProperties = {
      position: "fixed",
      width,
      left: Math.max(8, align === "left" ? r.left : r.right - width),
    };
    if (bare) s.bottom = window.innerHeight - r.top + 4; // open upward
    else s.top = r.bottom + 4;
    setMenuStyle(s);
  }, [open, align, bare]);

  function save() {
    downloadText("document.json", doc?.value ?? "");
    setOpen(false);
  }
  function loadFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => doc?.onReset(String(reader.result ?? ""));
    reader.readAsText(file);
  }

  async function exportBackup() {
    const state = await loadState();
    const payload = {
      kind: "kuya-json-backup",
      version: 1,
      exportedAt: new Date().toISOString(),
      state: state ?? null,
    };
    downloadText("kuya-json-backup.json", JSON.stringify(payload, null, 2));
    setOpen(false);
  }

  function importBackup(file: File) {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data = JSON.parse(String(reader.result ?? ""));
        // Accept the wrapped backup or a raw PersistState.
        const state = data?.kind === "kuya-json-backup" ? data.state : data;
        if (!state || !Array.isArray(state.workspaces)) {
          throw new Error("invalid");
        }
        if (
          !window.confirm(
            "Import backup? This replaces all current workspaces and folders.",
          )
        ) {
          return;
        }
        await saveState(state);
        window.location.reload();
      } catch {
        window.alert("That doesn't look like a valid Kuya JSON backup file.");
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        data-tour="settings"
        onClick={() => setOpen((o) => !o)}
        title="Settings"
        aria-label="Settings"
        aria-expanded={open}
        className={
          bare
            ? "flex h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:bg-bg-softer hover:text-gray-200"
            : "flex h-8 items-center justify-center rounded-md border border-border px-2 text-gray-300 hover:bg-bg-softer"
        }
      >
        <Settings size={15} />
      </button>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            style={menuStyle}
            className="z-[100] w-60 rounded-md border border-border bg-bg-soft p-1.5 shadow-lg"
          >
            {/* File */}
          <div className="px-1.5 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
            File
          </div>
          <button
            onClick={save}
            className="flex w-full items-center gap-2 rounded px-1.5 py-1.5 text-sm text-gray-300 hover:bg-bg-softer"
          >
            <Download size={14} className="text-gray-400" />
            Save…
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="flex w-full items-center gap-2 rounded px-1.5 py-1.5 text-sm text-gray-300 hover:bg-bg-softer"
          >
            <Upload size={14} className="text-gray-400" />
            Load…
          </button>
          <button
            onClick={exportBackup}
            className="flex w-full items-center gap-2 rounded px-1.5 py-1.5 text-sm text-gray-300 hover:bg-bg-softer"
          >
            <Archive size={14} className="text-gray-400" />
            Export backup…
          </button>
          <button
            onClick={() => backupRef.current?.click()}
            className="flex w-full items-center gap-2 rounded px-1.5 py-1.5 text-sm text-gray-300 hover:bg-bg-softer"
          >
            <ArchiveRestore size={14} className="text-gray-400" />
            Import backup…
          </button>

          <div className="my-1.5 border-t border-border" />

          {/* Preferences */}
          <div className="px-1.5 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
            Preferences
          </div>
          <div className="flex items-center justify-between gap-3 rounded px-1.5 py-1.5 hover:bg-bg-softer">
            <span className="text-sm text-gray-300">Vertical tabs</span>
            <Switch
              label=""
              checked={prefs.verticalTabs}
              onChange={(v) => setPref("verticalTabs", v)}
            />
          </div>
          <div className="flex items-center justify-between gap-3 rounded px-1.5 py-1.5 hover:bg-bg-softer">
            <span className="text-sm text-gray-300">Zen mode</span>
            <Switch
              label=""
              checked={prefs.zenMode}
              onChange={(v) => setPref("zenMode", v)}
            />
          </div>
          <div className="flex items-center justify-between gap-3 rounded px-1.5 py-1.5 hover:bg-bg-softer">
            <span className="text-sm text-gray-300">Theme</span>
            <ThemeSwitch dark={theme === "dark"} onToggle={toggle} />
          </div>
          </div>,
          document.body,
        )}
      <input
        ref={fileRef}
        type="file"
        accept=".json,.txt,application/json,text/plain"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) loadFile(file);
          e.target.value = "";
          setOpen(false);
        }}
      />
      <input
        ref={backupRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) importBackup(file);
          e.target.value = "";
          setOpen(false);
        }}
      />
    </div>
  );
}

/** A switch styled like the app's `Switch`, with a sun/moon thumb. */
function ThemeSwitch({ dark, onToggle }: { dark: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Toggle dark mode"
      onClick={onToggle}
      className={`inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 border-transparent transition-colors ${
        dark ? "bg-blue-500" : "bg-yellow-400"
      }`}
    >
      <span
        className={`flex h-4 w-4 items-center justify-center rounded-full bg-white shadow-lg transition-transform ${
          dark ? "translate-x-4" : "translate-x-0"
        }`}
      >
        {dark ? (
          <Moon size={9} className="text-blue-500" />
        ) : (
          <Sun size={9} className="text-amber-500" />
        )}
      </span>
    </button>
  );
}
