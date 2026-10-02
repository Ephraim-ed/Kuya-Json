"use client";

import { type RefObject, useCallback, useEffect, useRef, useState } from "react";
import { useCtrlWheelZoom } from "@/lib/useCtrlWheelZoom";
import JsonEditor, { type JsonEditorHandle } from "./JsonEditor";
import WorkspaceTabs from "./WorkspaceTabs";
import ZoomControls from "./ZoomControls";
import Breadcrumbs from "./Breadcrumbs";
import KuyaSprite from "./KuyaSprite";
import Typewriter from "./Typewriter";
import { DockPanel, useConsole } from "./console";
import { validate } from "@/lib/json/validate";
import type { Workspace, Folder } from "@/lib/persist";

const ZOOM_KEY = "editor:fontSize";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onReset: (v: string) => void;
  editorRef?: RefObject<JsonEditorHandle | null>;
  /** Selected node path (for breadcrumbs); null hides the bar. */
  selectedPath?: string | null;
  onSelectPath?: (path: string) => void;
  onDeselect?: () => void;
  /** Cursor moved in the editor — gives the character offset. */
  onCursor?: (offset: number) => void;
  // Workspace tab bar
  workspaces: Workspace[];
  activeId: string;
  onSwitchWorkspace: (id: string) => void;
  onAddWorkspace: () => void;
  onCloseWorkspace: (id: string) => void;
  onRenameWorkspace: (id: string, name: string) => void;
  onTogglePinWorkspace: (id: string) => void;
  /** Hide the open-editor tab bar (vertical tabs: the Explorer drives nav). */
  hideTabs?: boolean;
  // Folder grouping for horizontal tabs (optional).
  folders?: Folder[];
  onGroupTabs?: (dragId: string, targetId: string) => void;
  onMoveToFolder?: (id: string, folderId: string | null) => void;
  onRenameFolder?: (id: string, name: string) => void;
  onToggleFolder?: (id: string) => void;
  onSetFolderColor?: (id: string, color: string) => void;
  onReorder?: (dragId: string, targetId: string, before: boolean) => void;
}

/**
 * The single working-document section: the workspace tab bar, the editor, and a
 * resizable error console below. Validation results go to the console (no inline
 * markers); document actions live in each tool's control row.
 */
export default function InputPanel({
  value,
  onChange,
  onReset,
  editorRef,
  selectedPath,
  onSelectPath,
  onDeselect,
  onCursor,
  workspaces,
  activeId,
  onSwitchWorkspace,
  onAddWorkspace,
  onCloseWorkspace,
  onRenameWorkspace,
  onTogglePinWorkspace,
  hideTabs = false,
  folders,
  onGroupTabs,
  onMoveToFolder,
  onRenameFolder,
  onToggleFolder,
  onSetFolderColor,
  onReorder,
}: Props) {
  const [dragging, setDragging] = useState(false);
  const [fontSize, setFontSize] = useState(13);
  const editorAreaRef = useRef<HTMLDivElement>(null);
  const { push, clearSource } = useConsole();
  const prevMsg = useRef<string | null>(null);

  // Restore / persist editor zoom.
  useEffect(() => {
    const s = Number(localStorage.getItem(ZOOM_KEY));
    if (s) setFontSize(Math.min(28, Math.max(9, s)));
  }, []);
  const changeZoom = useCallback((n: number) => {
    setFontSize(n);
    localStorage.setItem(ZOOM_KEY, String(n));
  }, []);
  useCtrlWheelZoom(editorAreaRef, fontSize, changeZoom);

  // Report the current validation error to the console; clear it once fixed.
  useEffect(() => {
    const r = value.trim() === "" ? { ok: true as const } : validate(value);
    if (r.ok) {
      if (prevMsg.current !== null) {
        clearSource("validate"); // error resolved → remove it
        prevMsg.current = null;
      }
    } else if (prevMsg.current !== r.error.message) {
      clearSource("validate"); // replace any stale error
      const pos = r.error.position;
      const range =
        pos != null ? { from: Math.max(0, pos - 1), to: pos + 1 } : undefined;
      push("error", r.error.message, "validate", range);
      prevMsg.current = r.error.message;
    }
  }, [value, push, clearSource]);

  function loadFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => onReset(String(reader.result ?? ""));
    reader.readAsText(file);
  }

  return (
    <div
      className="relative flex h-full min-h-0 flex-col"
      onDragOver={(e) => {
        // Only react to real file drags — ignore tab/workspace drags so tabs
        // can be reordered and dropped without the "load a file" overlay.
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) loadFile(file);
      }}
    >
      {/* Open-editor tabs for this group (hidden in vertical-tabs mode, where
          the Explorer sidebar drives navigation). */}
      {!hideTabs && (
        <div className="border-b border-border">
          <WorkspaceTabs
            editorTabs
            workspaces={workspaces}
            activeId={activeId}
            onSwitch={onSwitchWorkspace}
            onAdd={onAddWorkspace}
            onClose={onCloseWorkspace}
            onRename={onRenameWorkspace}
            onTogglePin={onTogglePinWorkspace}
            folders={folders}
            onGroupTabs={onGroupTabs}
            onMoveToFolder={onMoveToFolder}
            onRenameFolder={onRenameFolder}
            onToggleFolder={onToggleFolder}
            onSetFolderColor={onSetFolderColor}
            onReorder={onReorder}
          />
        </div>
      )}

      {/* Editor */}
      <div ref={editorAreaRef} data-tour="editor" className="relative min-h-0 flex-1">
        <JsonEditor
          ref={editorRef}
          value={value}
          onChange={onChange}
          fontSize={fontSize}
          onUserSelect={(offset) => {
            if (onCursor) onCursor(offset);
            else onDeselect?.();
          }}
          placeholder=""
        />
        {value.trim() === "" && (
          <div className="animate-kuya-fade pointer-events-none absolute inset-0 z-[5] flex flex-col items-center justify-center px-6 text-center">
            <KuyaSprite size={88} />
            <p className="mt-2 text-sm font-medium text-gray-300">
              <Typewriter text="Start by adding some JSON" />
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Type or paste here, drop a <span className="text-gray-400">.json</span> file,
              or load one from <span className="text-gray-400">Settings</span>.
            </p>
          </div>
        )}
        <div className="absolute bottom-2 right-3 z-10 rounded-md border border-border bg-bg-soft/90 px-1 py-0.5 opacity-60 shadow-sm backdrop-blur transition-opacity hover:opacity-100">
          <ZoomControls size={fontSize} setSize={changeZoom} />
        </div>
      </div>

      {/* Bottom dock: console + search output */}
      <DockPanel
        onFocusRange={(from, to) => editorRef?.current?.focusRange(from, to)}
      />

      {/* Breadcrumbs for the selected node (hidden when nothing or only the
          root is selected) */}
      {selectedPath && selectedPath !== "$" && onSelectPath && (
        <Breadcrumbs path={selectedPath} onSelect={onSelectPath} />
      )}

      {dragging && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center border-2 border-dashed border-accent bg-bg/80 text-sm text-accent-fg">
          Drop a .json file to load
        </div>
      )}
    </div>
  );
}
