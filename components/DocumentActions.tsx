"use client";

import { createContext, useContext, useRef, type ReactNode } from "react";
import { Button } from "./ui";
import { SAMPLE_JSON } from "@/lib/sample";

interface DocActionsValue {
  value: string;
  onReset: (v: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const Ctx = createContext<DocActionsValue | null>(null);

export function DocumentActionsProvider({
  value,
  children,
}: {
  value: DocActionsValue;
  children: ReactNode;
}) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** The shared document actions (undo/redo, load, sample, clear). Rendered at the
 *  right of each tool's control row. */
export function DocumentActions({ className = "" }: { className?: string }) {
  const ctx = useContext(Ctx);
  const fileRef = useRef<HTMLInputElement>(null);
  if (!ctx) return null;
  const { value, onReset } = ctx;

  function loadFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => onReset(String(reader.result ?? ""));
    reader.readAsText(file);
  }

  return (
    <div className={`flex shrink-0 items-center gap-1.5 ${className}`}>
      <Button onClick={() => fileRef.current?.click()} title="Load a .json file">
        Load
      </Button>
      <Button onClick={() => onReset(SAMPLE_JSON)} title="Insert sample JSON">
        Sample
      </Button>
      <Button
        variant="danger"
        onClick={() => onReset("")}
        disabled={!value}
        title="Clear"
      >
        Clear
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept=".json,.txt,application/json,text/plain"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) loadFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
