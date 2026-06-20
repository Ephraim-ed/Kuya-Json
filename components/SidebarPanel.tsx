"use client";

import { useState } from "react";
import { Columns2, Rows2 } from "lucide-react";
import Split from "./Split";
import WorkspaceTabs from "./WorkspaceTabs";
import TreeSidebar from "./TreeSidebar";
import Tooltip from "./Tooltip";
import type { Workspace, Folder } from "@/lib/persist";

interface Props {
  // Workspace tab props
  workspaces: Workspace[];
  folders: Folder[];
  activeId: string;
  onSwitchWorkspace: (id: string) => void;
  onAddWorkspace: () => void;
  onCloseWorkspace: (id: string) => void;
  onRenameWorkspace: (id: string, name: string) => void;
  onTogglePinWorkspace: (id: string) => void;
  onGroupTabs: (dragId: string, targetId: string) => void;
  onMoveToFolder: (id: string, folderId: string | null) => void;
  onRenameFolder: (id: string, name: string) => void;
  onToggleFolder: (id: string) => void;
  // Tree props
  input: string;
  selectedPath: string | null;
  onSelectPath: (path: string) => void;
  onOpenSubtree: (path: string) => void;
  // Layout
  split: boolean;
  onToggleSplit: () => void;
}

/**
 * The left sidebar when "vertical tabs" is on: hosts the vertical workspace list
 * and the structure tree, either as a [Workspaces | Tree] switcher or, when
 * `split` is on, as two stacked panes (tabs on top, tree on bottom).
 */
export default function SidebarPanel({
  workspaces,
  folders,
  activeId,
  onSwitchWorkspace,
  onAddWorkspace,
  onCloseWorkspace,
  onRenameWorkspace,
  onTogglePinWorkspace,
  onGroupTabs,
  onMoveToFolder,
  onRenameFolder,
  onToggleFolder,
  input,
  selectedPath,
  onSelectPath,
  onOpenSubtree,
  split,
  onToggleSplit,
}: Props) {
  const [tab, setTab] = useState<"workspaces" | "tree">("workspaces");

  const tabs = (
    <WorkspaceTabs
      orientation="vertical"
      workspaces={workspaces}
      folders={folders}
      activeId={activeId}
      onSwitch={onSwitchWorkspace}
      onAdd={onAddWorkspace}
      onClose={onCloseWorkspace}
      onRename={onRenameWorkspace}
      onTogglePin={onTogglePinWorkspace}
      onGroupTabs={onGroupTabs}
      onMoveToFolder={onMoveToFolder}
      onRenameFolder={onRenameFolder}
      onToggleFolder={onToggleFolder}
    />
  );

  const tree = (
    <TreeSidebar
      input={input}
      selectedPath={selectedPath}
      onSelect={onSelectPath}
      onOpenSubtree={onOpenSubtree}
    />
  );

  const splitButton = (
    <Tooltip text={split ? "Combine into tabs" : "Split: tabs over tree"} width={170}>
      <button
        onClick={onToggleSplit}
        aria-label="Toggle split layout"
        className={`flex h-6 w-6 items-center justify-center rounded-md border border-border text-gray-400 hover:bg-bg-softer hover:text-gray-200 ${
          split ? "bg-bg-softer text-gray-200" : ""
        }`}
      >
        {split ? <Columns2 size={13} /> : <Rows2 size={13} />}
      </button>
    </Tooltip>
  );

  // Split mode: two stacked panes with a draggable divider.
  if (split) {
    return (
      <div className="relative flex h-full min-h-0 flex-col bg-bg-soft">
        <div className="flex items-center justify-end gap-1.5 border-b border-border px-2 py-1.5">
          {splitButton}
        </div>
        <div className="min-h-0 flex-1">
          <Split
            direction="vertical"
            initial={0.5}
            min={0.15}
            max={0.85}
            storageKey="sidebar-vsplit"
            first={tabs}
            second={tree}
          />
        </div>
      </div>
    );
  }

  // Tabbed mode: a Chrome-style [Workspaces | Tree] tab strip.
  return (
    <div className="relative flex h-full min-h-0 flex-col bg-bg-soft">
      <div className="flex items-end gap-1 border-b border-border bg-bg px-1.5 pt-1.5">
        {(["workspaces", "tree"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex h-7 items-center rounded-t-lg px-3 text-xs font-medium capitalize transition-colors ${
              tab === t
                ? "ctab-active z-10 -mb-px bg-bg-soft text-gray-100"
                : "bg-transparent text-gray-400 hover:bg-bg-soft hover:text-gray-200"
            }`}
          >
            {t}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1.5 pb-1">
          {splitButton}
        </div>
      </div>
      <div className="min-h-0 flex-1">{tab === "workspaces" ? tabs : tree}</div>
    </div>
  );
}
