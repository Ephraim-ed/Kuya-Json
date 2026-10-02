"use client";

import { useState, type ReactNode } from "react";
import { PanelLeft, PanelRight } from "lucide-react";

const MIME = "application/x-workspace-id";
/** Height of the tab strip to exclude from the split drop zones (px). */
const TAB_BAND = 40;

/**
 * Wraps the document editor so a workspace dragged from the sidebar can be
 * dropped on a left or right zone to open it on that side.
 */
export default function EditorDropZones({
  onDropLeft,
  onDropRight,
  children,
}: {
  onDropLeft: (id: string) => void;
  onDropRight: (id: string) => void;
  children: ReactNode;
}) {
  const [side, setSide] = useState<"left" | "right" | null>(null);

  const isWorkspaceDrag = (e: React.DragEvent) =>
    e.dataTransfer.types.includes(MIME);

  return (
    <div
      className="relative h-full min-h-0"
      onDragOver={(e) => {
        if (!isWorkspaceDrag(e)) return;
        const rect = e.currentTarget.getBoundingClientRect();
        // Leave the top tab-strip band alone so tabs can be reordered there.
        if (e.clientY - rect.top < TAB_BAND) {
          setSide(null);
          return;
        }
        e.preventDefault();
        setSide(e.clientX - rect.left < rect.width / 2 ? "left" : "right");
      }}
      onDragLeave={(e) => {
        // Only clear when leaving the container, not its children.
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setSide(null);
      }}
      onDrop={(e) => {
        const id = e.dataTransfer.getData(MIME);
        if (!id) return;
        e.preventDefault();
        const s = side;
        setSide(null);
        if (s === "left") onDropLeft(id);
        else if (s === "right") onDropRight(id);
      }}
    >
      {children}
      {side && (
        <div className="pointer-events-none absolute inset-0 z-20 flex">
          <div
            className={`flex flex-1 items-center justify-center border-r border-accent/40 transition-colors ${
              side === "left" ? "bg-accent/20" : "bg-black/10"
            }`}
          >
            <PanelLeft size={26} className="text-accent-fg" />
          </div>
          <div
            className={`flex flex-1 items-center justify-center transition-colors ${
              side === "right" ? "bg-accent/20" : "bg-black/10"
            }`}
          >
            <PanelRight size={26} className="text-accent-fg" />
          </div>
        </div>
      )}
    </div>
  );
}
