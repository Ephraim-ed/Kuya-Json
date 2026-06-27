"use client";

import { useState } from "react";
import { Layers, ListTree } from "lucide-react";
import Split from "./Split";
import WorkspaceTabs from "./WorkspaceTabs";
import TreeSidebar from "./TreeSidebar";
import type { Workspace, Folder } from "@/lib/persist";

interface Props {
  // Workspace tab props
  workspaces: Workspace[];
  folders: Folder[];
  activeId: string;
  onOpenWorkspace: (id: string) => void;
  onAddWorkspace: () => void;
  onDeleteWorkspace: (id: string) => void;
  onRenameWorkspace: (id: string, name: string) => void;
  onTogglePinWorkspace: (id: string) => void;
  onGroupTabs: (dragId: string, targetId: string) => void;
  onMoveToFolder: (id: string, folderId: string | null) => void;
  onDeleteFolder: (id: string, deleteContents?: boolean) => void;
  onRenameFolder: (id: string, name: string) => void;
  onToggleFolder: (id: string) => void;
  onSetFolderColor: (id: string, color: string) => void;
  onOpenSide: (id: string) => void;
  openSides: Record<string, "left" | "right" | "both">;
  // Tree props
  input: string;
  selectedPath: string | null;
  onSelectPath: (path: string) => void;
  onOpenSubtree: (path: string) => void;
  // Layout
  split: boolean;
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
  onOpenWorkspace,
  onAddWorkspace,
  onDeleteWorkspace,
  onRenameWorkspace,
  onTogglePinWorkspace,
  onGroupTabs,
  onMoveToFolder,
  onDeleteFolder,
  onRenameFolder,
  onToggleFolder,
  onSetFolderColor,
  onOpenSide,
  openSides,
  input,
  selectedPath,
  onSelectPath,
  onOpenSubtree,
  split,
}: Props) {
  const [tab, setTab] = useState<"workspaces" | "tree">("workspaces");

  const tabs = (
    <WorkspaceTabs
      orientation="vertical"
      workspaces={workspaces}
      folders={folders}
      activeId={activeId}
      onSwitch={onOpenWorkspace}
      onAdd={onAddWorkspace}
      onClose={onDeleteWorkspace}
      onRename={onRenameWorkspace}
      onTogglePin={onTogglePinWorkspace}
      onGroupTabs={onGroupTabs}
      onMoveToFolder={onMoveToFolder}
      onDeleteFolder={onDeleteFolder}
      onRenameFolder={onRenameFolder}
      onToggleFolder={onToggleFolder}
      onSetFolderColor={onSetFolderColor}
      onOpenSide={onOpenSide}
      openSides={openSides}
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

  // Split mode: two stacked panes with a draggable divider.
  if (split) {
    return (
      <div data-tour="sidebar" className="relative flex h-full min-h-0 flex-col bg-bg-soft">
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
    <div data-tour="sidebar" className="relative flex h-full min-h-0 flex-col bg-bg-soft">
      <div className="flex items-end gap-1 border-b border-border bg-bg px-1.5 pt-1.5">
        {(["workspaces", "tree"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex h-7 items-center gap-1.5 rounded-t-lg px-3 text-xs font-medium capitalize transition-colors ${
              tab === t
                ? "z-10 -mb-px border border-b-0 border-border bg-bg-soft text-gray-100"
                : "border border-transparent bg-transparent text-gray-400 hover:bg-bg-soft hover:text-gray-200"
            }`}
          >
            {t === "workspaces" ? <Layers size={13} /> : <ListTree size={13} />}
            {t}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1">{tab === "workspaces" ? tabs : tree}</div>
    </div>
  );
}
