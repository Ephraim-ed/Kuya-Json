"use client";

import { type ReactNode } from "react";
import Split from "../Split";
import FloatingToolbar from "../FloatingToolbar";
import { useZen } from "../zen";

interface Props {
  /** Top control bar (buttons, selects, inline messages). */
  controls: ReactNode;
  /** The shared document editor. */
  editor: ReactNode;
  /** Optional results region; when present it appears in a resizable bottom pane. */
  results?: ReactNode;
  /** Storage key for the editor/results split size. */
  splitKey?: string;
  /** Where the results pane sits relative to the editor. Default "vertical" (below). */
  direction?: "vertical" | "horizontal";
}

/** Standard single-document tool layout: controls on top, one editor, optional
 *  resizable results pane (below by default, or beside when horizontal). */
export default function ToolFrame({
  controls,
  editor,
  results,
  splitKey,
  direction = "vertical",
}: Props) {
  const zen = useZen();
  return (
    <div className="flex h-full min-h-0 flex-col">
      {!zen && <div data-tour="toolbar">{controls}</div>}
      <div className="min-h-0 flex-1">
        {results ? (
          <Split
            direction={direction}
            initial={0.55}
            storageKey={splitKey ?? "tool-results"}
            first={editor}
            second={results}
          />
        ) : (
          editor
        )}
      </div>
      {zen && <FloatingToolbar>{controls}</FloatingToolbar>}
    </div>
  );
}
