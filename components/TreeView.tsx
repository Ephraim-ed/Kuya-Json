"use client";

import { useState } from "react";
import { type TreeNode, type ValueType } from "@/lib/json/tree";
import { copyText } from "@/lib/clipboard";
import { useToast } from "./ui";

const TYPE_VAR: Record<ValueType, string> = {
  object: "var(--tree-punct)",
  array: "var(--tree-punct)",
  string: "var(--tree-string)",
  number: "var(--tree-number)",
  boolean: "var(--tree-boolean)",
  null: "var(--tree-null)",
};

function renderValue(node: TreeNode): string {
  if (node.type === "string") return `"${node.value}"`;
  return String(node.value);
}

interface TreeProps {
  onSelect?: (path: string) => void;
  selectedPath?: string | null;
  /** Force-expand all containers (used while filtering). */
  forceOpen?: boolean;
  /** Containers at depth < expandLevel start expanded. */
  expandLevel?: number;
  /** Open a node's subtree in a new workspace. */
  onOpenSubtree?: (path: string) => void;
}

function Node({
  node,
  depth,
  onSelect,
  selectedPath,
  forceOpen,
  expandLevel = 2,
  onOpenSubtree,
}: TreeProps & { node: TreeNode; depth: number }) {
  const [open, setOpen] = useState(depth < expandLevel);
  const toast = useToast();
  const isContainer = node.type === "object" || node.type === "array";
  const selected = selectedPath === node.path;
  const expanded = forceOpen || open; // filtering force-expands

  async function copyPath(e: React.MouseEvent) {
    e.stopPropagation();
    const ok = await copyText(node.path);
    toast(ok ? "Copied path" : "Copy failed");
  }

  return (
    <div className="leading-[1.5]">
      <div
        onClick={() => onSelect?.(node.path)}
        className={`group flex cursor-pointer items-center gap-1.5 rounded px-1 ${
          selected ? "bg-accent/20 ring-1 ring-accent/40" : "hover:bg-bg-soft"
        }`}
        title={`Focus ${node.path}`}
      >
        {isContainer ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setOpen((o) => !o);
            }}
            className="w-4 shrink-0 text-gray-500 hover:text-gray-200"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            <span
              className={`inline-block transition-transform duration-200 ${
                expanded ? "rotate-90" : ""
              }`}
            >
              ▸
            </span>
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}

        <span
          className="shrink-0 font-mono text-[1em]"
          style={{ color: "var(--tree-key)" }}
        >
          {node.key}
          <span style={{ color: "var(--tree-punct)" }}>:</span>
        </span>

        {isContainer ? (
          <span className="text-[0.82em] text-gray-500">
            {node.type === "array" ? `[${node.size}]` : `{${node.size}}`}
          </span>
        ) : (
          <span
            className="truncate font-mono text-[1em]"
            style={{ color: TYPE_VAR[node.type] }}
          >
            {renderValue(node)}
          </span>
        )}

        <span className="ml-auto flex shrink-0 items-center">
          {isContainer && onOpenSubtree && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenSubtree(node.path);
              }}
              title="Open subtree in new workspace"
              className="hidden px-1 text-[0.82em] text-gray-500 hover:text-accent-fg group-hover:block"
            >
              ↗
            </button>
          )}
          <button
            onClick={copyPath}
            title="Copy JSONPath"
            className="hidden px-1 text-[0.82em] text-gray-500 hover:text-gray-200 group-hover:block"
          >
            ⧉
          </button>
        </span>
      </div>

      {isContainer && expanded && node.children && (
        <div className="ml-[9px] border-l border-border pl-2">
          {node.children.map((child, i) => (
            <Node
              key={i}
              node={child}
              depth={depth + 1}
              onSelect={onSelect}
              selectedPath={selectedPath}
              forceOpen={forceOpen}
              expandLevel={expandLevel}
              onOpenSubtree={onOpenSubtree}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function TreeView({
  root,
  onSelect,
  selectedPath,
  forceOpen,
  expandLevel = 2,
  onOpenSubtree,
  fontSize = 13,
}: TreeProps & { root: TreeNode; fontSize?: number }) {
  return (
    <div
      className="h-full overflow-auto p-2 font-mono"
      style={{ fontSize }}
    >
      {/* Key on expandLevel so changing it remounts and re-applies depth. */}
      <Node
        key={forceOpen ? "filtered" : `lvl-${expandLevel}`}
        node={root}
        depth={0}
        onSelect={onSelect}
        selectedPath={selectedPath}
        forceOpen={forceOpen}
        expandLevel={expandLevel}
        onOpenSubtree={onOpenSubtree}
      />
    </div>
  );
}
