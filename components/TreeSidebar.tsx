"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronsUp, ChevronsDown, Search, X } from "lucide-react";
import TreeView from "./TreeView";
import ZoomControls from "./ZoomControls";
import Tooltip from "./Tooltip";
import { useCtrlWheelZoom } from "@/lib/useCtrlWheelZoom";
import { buildTree, filterTree } from "@/lib/json/tree";
import { validate } from "@/lib/json/validate";

const ZOOM_KEY = "tree:fontSize";
const LEVEL_KEY = "tree:expandLevel";

interface Props {
  input: string;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  onOpenSubtree?: (path: string) => void;
  /** Mobile drawer close button; omitted on desktop. */
  onClose?: () => void;
}

export default function TreeSidebar({
  input,
  selectedPath,
  onSelect,
  onOpenSubtree,
  onClose,
}: Props) {
  const [filter, setFilter] = useState("");
  const [fontSize, setFontSize] = useState(13);
  const [expandLevel, setExpandLevel] = useState(1);
  const treeAreaRef = useRef<HTMLDivElement>(null);
  const parsed = useMemo(() => validate(input), [input]);

  useEffect(() => {
    const s = Number(localStorage.getItem(ZOOM_KEY));
    if (s) setFontSize(Math.min(28, Math.max(9, s)));
    const lvl = Number(localStorage.getItem(LEVEL_KEY));
    if (lvl) setExpandLevel(lvl);
  }, []);
  const changeZoom = useCallback((n: number) => {
    setFontSize(n);
    localStorage.setItem(ZOOM_KEY, String(n));
  }, []);
  useCtrlWheelZoom(treeAreaRef, fontSize, changeZoom);
  function changeLevel(n: number) {
    setExpandLevel(n);
    localStorage.setItem(LEVEL_KEY, String(n));
  }
  const tree = useMemo(
    () => (parsed.ok ? buildTree(parsed.value) : null),
    [parsed],
  );
  const filtered = useMemo(
    () => (tree ? filterTree(tree, filter) : null),
    [tree, filter],
  );
  const filtering = filter.trim() !== "";

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-bg-soft">
      <div className="flex items-center gap-1.5 border-b border-border px-2 py-1.5">
        <div className="relative flex-1">
          <Search
            size={12}
            className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-gray-500"
          />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setFilter("");
            }}
            placeholder="Search tree…"
            className="w-full rounded border border-border bg-bg py-1 pl-7 pr-6 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-accent"
          />
          {filtering && (
            <button
              onClick={() => setFilter("")}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-200"
              aria-label="Clear search"
            >
              <X size={12} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Depth: collapse-all · level · expand-all (one segmented control) */}
          <div
            className={`inline-flex items-center overflow-hidden rounded-md border border-border bg-bg ${
              filtering ? "pointer-events-none opacity-40" : ""
            }`}
          >
            <Tooltip text="Collapse to top level" width={160}>
              <button
                onClick={() => changeLevel(1)}
                aria-label="Collapse all"
                className="flex h-6 w-6 items-center justify-center text-gray-400 transition-colors hover:bg-bg-softer hover:text-gray-200"
              >
                <ChevronsUp size={13} />
              </button>
            </Tooltip>
            <select
              value={expandLevel}
              onChange={(e) => changeLevel(Number(e.target.value))}
              title="Expand to depth"
              className="h-6 cursor-pointer border-x border-border bg-transparent pl-1.5 pr-0.5 text-[11px] tabular-nums text-gray-300 focus:outline-none"
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
              <option value={5}>5</option>
              <option value={99}>All</option>
            </select>
            <Tooltip text="Expand all levels" width={150}>
              <button
                onClick={() => changeLevel(99)}
                aria-label="Expand all"
                className="flex h-6 w-6 items-center justify-center text-gray-400 transition-colors hover:bg-bg-softer hover:text-gray-200"
              >
                <ChevronsDown size={13} />
              </button>
            </Tooltip>
          </div>

          <ZoomControls size={fontSize} setSize={changeZoom} />

          {onClose && (
            <button
              onClick={onClose}
              className="px-1 text-gray-400 hover:text-gray-200 lg:hidden"
              aria-label="Close tree"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div ref={treeAreaRef} className="min-h-0 flex-1">
        {input.trim() === "" ? (
          <p className="p-3 text-xs text-gray-600">Paste JSON to see its tree.</p>
        ) : !tree ? (
          <p className="p-3 text-xs text-red-400">
            {!parsed.ok ? parsed.error.message : "Invalid JSON."}
          </p>
        ) : filtered ? (
          <TreeView
            root={filtered}
            onSelect={onSelect}
            selectedPath={selectedPath}
            forceOpen={filtering}
            expandLevel={expandLevel}
            fontSize={fontSize}
            onOpenSubtree={onOpenSubtree}
          />
        ) : (
          <p className="p-3 text-xs text-gray-600">No matches for “{filter}”.</p>
        )}
      </div>
    </div>
  );
}
