"use client";

import { X } from "lucide-react";
import InputPanel from "./InputPanel";
import { ConsoleProvider } from "./console";
import type { Workspace } from "@/lib/persist";

/**
 * The right editor group: a full editor (open-editor tabs + editor + console),
 * just like the left. Its console is isolated in its own ConsoleProvider so it
 * doesn't clash with the left group.
 */
export default function SecondaryEditor({
  value,
  onChange,
  onReset,
  workspaces,
  activeId,
  onSwitch,
  onAdd,
  onClose,
  onRename,
  onTogglePin,
  onCloseSplit,
  hideTabs,
}: {
  value: string;
  onChange: (v: string) => void;
  onReset: (v: string) => void;
  workspaces: Workspace[];
  activeId: string;
  onSwitch: (id: string) => void;
  onAdd: () => void;
  onClose: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onTogglePin: (id: string) => void;
  onCloseSplit: () => void;
  hideTabs: boolean;
}) {
  return (
    <ConsoleProvider>
      <div className="relative flex h-full min-h-0 flex-col border-l border-border">
        <button
          onClick={onCloseSplit}
          title="Close this group"
          aria-label="Close this group"
          className="absolute right-1.5 top-1.5 z-20 flex h-6 w-6 items-center justify-center rounded-md text-gray-400 hover:bg-bg-softer hover:text-red-300"
        >
          <X size={14} />
        </button>
        <InputPanel
          value={value}
          onChange={onChange}
          onReset={onReset}
          workspaces={workspaces}
          activeId={activeId}
          onSwitchWorkspace={onSwitch}
          onAddWorkspace={onAdd}
          onCloseWorkspace={onClose}
          onRenameWorkspace={onRename}
          onTogglePinWorkspace={onTogglePin}
          hideTabs={hideTabs}
        />
      </div>
    </ConsoleProvider>
  );
}
