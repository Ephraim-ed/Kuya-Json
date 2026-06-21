"use client";

import { X } from "lucide-react";
import InputPanel from "./InputPanel";
import { ConsoleProvider } from "./console";
import type { Workspace } from "@/lib/persist";

/**
 * The right pane of the split view: a full editor (tabs + editor + console),
 * just like the left, but bound to the split workspace. Its console is isolated
 * in its own ConsoleProvider so it doesn't clash with the left pane.
 */
export default function SecondaryEditor({
  value,
  onChange,
  onReset,
  workspaces,
  splitId,
  onSwitch,
  onAdd,
  onClose,
  onRename,
  onTogglePin,
  onCloseSplit,
  verticalTabs,
}: {
  value: string;
  onChange: (v: string) => void;
  onReset: (v: string) => void;
  workspaces: Workspace[];
  splitId: string;
  onSwitch: (id: string) => void;
  onAdd: () => void;
  onClose: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onTogglePin: (id: string) => void;
  onCloseSplit: () => void;
  verticalTabs: boolean;
}) {
  return (
    <ConsoleProvider>
      <div className="relative flex h-full min-h-0 flex-col border-l border-border">
        {/* In horizontal-tabs mode the right pane has its own tab bar, so show a
            close button here. In vertical mode the split is closed from the
            sidebar tab instead. */}
        {!verticalTabs && (
          <button
            onClick={onCloseSplit}
            title="Close split"
            aria-label="Close split"
            className="absolute right-1.5 top-1.5 z-20 flex h-6 w-6 items-center justify-center rounded-md text-gray-400 hover:bg-bg-softer hover:text-red-300"
          >
            <X size={14} />
          </button>
        )}
        <InputPanel
          value={value}
          onChange={onChange}
          onReset={onReset}
          workspaces={workspaces}
          activeId={splitId}
          onSwitchWorkspace={onSwitch}
          onAddWorkspace={onAdd}
          onCloseWorkspace={onClose}
          onRenameWorkspace={onRename}
          onTogglePinWorkspace={onTogglePin}
          verticalTabs={verticalTabs}
        />
      </div>
    </ConsoleProvider>
  );
}
