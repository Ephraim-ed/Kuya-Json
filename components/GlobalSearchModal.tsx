"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { Dialog } from "./ui/dialog";
import type { Workspace } from "@/lib/persist";

interface Props {
  open: boolean;
  onClose: () => void;
  workspaces: Workspace[];
  activeId: string;
  /** Switch to a workspace and select the given range in the editor. */
  onJump: (workspaceId: string, from: number, to: number) => void;
}

interface Hit {
  from: number;
  to: number;
  line: number;
  preview: string;
}
interface WsResult {
  id: string;
  name: string;
  hits: Hit[];
}

const PER_WS = 200;

function findHits(text: string, q: string): Hit[] {
  const hits: Hit[] = [];
  if (!q) return hits;
  const lower = text.toLowerCase();
  const needle = q.toLowerCase();
  let i = lower.indexOf(needle);
  let line = 1;
  let scanned = 0;
  while (i !== -1 && hits.length < PER_WS) {
    // count newlines up to i (incrementally)
    for (; scanned < i; scanned++) if (text[scanned] === "\n") line++;
    const start = text.lastIndexOf("\n", i) + 1;
    let end = text.indexOf("\n", i);
    if (end === -1) end = text.length;
    const raw = text.slice(start, end).trim();
    hits.push({
      from: i,
      to: i + q.length,
      line,
      preview: raw.length > 100 ? raw.slice(0, 97) + "…" : raw,
    });
    i = lower.indexOf(needle, i + needle.length);
  }
  return hits;
}

export default function GlobalSearchModal({
  open,
  onClose,
  workspaces,
  activeId,
  onJump,
}: Props) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const results: WsResult[] = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return workspaces
      .map((w) => ({ id: w.id, name: w.name, hits: findHits(w.content, q) }))
      .filter((r) => r.hits.length > 0);
  }, [query, workspaces]);

  const total = results.reduce((n, r) => n + r.hits.length, 0);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      label="Search all workspaces"
      initialFocus={inputRef}
      className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-border bg-bg-soft shadow-2xl"
    >
      <div className="flex items-center gap-2 border-b border-border p-2">
        <Search size={15} className="ml-1 text-gray-500" aria-hidden="true" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search all workspaces…"
          className="min-w-0 flex-1 bg-transparent px-1 py-1 font-mono text-sm text-gray-200 focus:outline-none"
        />
        <span className="shrink-0 text-xs text-gray-500">
          {query.trim() ? `${total} in ${results.length} ws` : ""}
        </span>
        <button
          onClick={onClose}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-bg-softer hover:text-gray-200"
          aria-label="Close"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-2">
        {query.trim() === "" ? (
          <p className="p-3 text-sm text-gray-600">
            Type to search the content of every workspace. Click a result to
            open it.
          </p>
        ) : results.length === 0 ? (
          <p className="p-3 text-sm text-gray-600">
            No matches in any workspace.
          </p>
        ) : (
          results.map((r) => (
            <div key={r.id} className="mb-2">
              <div className="flex items-center gap-2 px-1 py-1 text-xs font-semibold text-gray-300">
                <span className="font-mono text-gray-500">{"{ }"}</span>
                {r.name}
                {r.id === activeId && (
                  <span className="rounded bg-bg-softer px-1 text-2xs text-gray-400">
                    current
                  </span>
                )}
                <span className="text-2xs font-normal text-gray-600">
                  {r.hits.length}
                </span>
              </div>
              {r.hits.map((h, i) => (
                <button
                  key={i}
                  onClick={() => onJump(r.id, h.from, h.to)}
                  className="flex w-full items-start gap-2 rounded px-2 py-0.5 text-left font-mono text-xs hover:bg-bg-softer"
                >
                  <span className="shrink-0 text-gray-600">{h.line}:</span>
                  <span className="flex-1 truncate text-gray-300">
                    {h.preview}
                  </span>
                </button>
              ))}
            </div>
          ))
        )}
      </div>
    </Dialog>
  );
}
