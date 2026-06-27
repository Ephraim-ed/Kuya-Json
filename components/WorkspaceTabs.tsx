"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Pin, PinOff, X, Trash2, Braces, Folder as FolderIcon, Layers, Columns2, PanelLeft, PanelRight, Search } from "lucide-react";
import type { Workspace, Folder } from "@/lib/persist";
import { useConfirm } from "./ConfirmDialog";
import { FOLDER_COLORS, DEFAULT_FOLDER_COLOR } from "@/lib/folderColors";

interface Props {
  workspaces: Workspace[];
  activeId: string;
  onSwitch: (id: string) => void;
  onAdd: () => void;
  onClose: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onTogglePin: (id: string) => void;
  /** "horizontal" (tab bar) or "vertical" (sidebar list). Default horizontal. */
  orientation?: "horizontal" | "vertical";
  // Folder/grouping props (vertical mode only).
  folders?: Folder[];
  onGroupTabs?: (dragId: string, targetId: string) => void;
  onMoveToFolder?: (id: string, folderId: string | null) => void;
  onDeleteFolder?: (id: string, deleteContents?: boolean) => void;
  onRenameFolder?: (id: string, name: string) => void;
  onToggleFolder?: (id: string) => void;
  onSetFolderColor?: (id: string, color: string) => void;
  /** Open this file in the right editor group (Explorer "open to the side"). */
  onOpenSide?: (id: string) => void;
  /** Which pane(s) each file is open in (Explorer side indicator). */
  openSides?: Record<string, "left" | "right" | "both">;
  /** Editor-tab mode: preserve order (no pinned-first), no pin/folder UI. */
  editorTabs?: boolean;
  /** Rearrange a tab relative to a target (drag to reorder). */
  onReorder?: (dragId: string, targetId: string, before: boolean) => void;
}

export default function WorkspaceTabs({
  workspaces,
  activeId,
  onSwitch,
  onAdd,
  onClose,
  onRename,
  onTogglePin,
  orientation = "horizontal",
  folders = [],
  onGroupTabs,
  onMoveToFolder,
  onDeleteFolder,
  onRenameFolder,
  onToggleFolder,
  onSetFolderColor,
  onOpenSide,
  openSides,
  editorTabs,
  onReorder,
}: Props) {
  const confirm = useConfirm();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [overflowing, setOverflowing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [folderDraft, setFolderDraft] = useState("");
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState<"before" | "after" | "group">("group");
  const [pinnedCollapsed, setPinnedCollapsed] = useState(false);
  const [query, setQuery] = useState("");
  const [colorMenu, setColorMenu] = useState<{
    id: string;
    x: number;
    y: number;
  } | null>(null);
  const dragId = useRef<string | null>(null);
  const colorMenuRef = useRef<HTMLDivElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Editor tabs keep their given (open) order; Explorer pins float to the top.
  const ordered = useMemo(() => {
    if (editorTabs) return workspaces;
    const pinned = workspaces.filter((w) => w.pinned);
    const rest = workspaces.filter((w) => !w.pinned);
    return [...pinned, ...rest];
  }, [workspaces, editorTabs]);

  useEffect(() => {
    if (editingId) inputRef.current?.select();
  }, [editingId]);

  useEffect(() => {
    if (editingFolderId) folderInputRef.current?.select();
  }, [editingFolderId]);

  // Mouse-wheel (vertical) scrolls the tab row horizontally.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return; // nothing to scroll
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return; // let real horizontal pass
      el.scrollLeft += e.deltaY;
      e.preventDefault();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Track whether the tab row overflows so we can offer the dropdown.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => setOverflowing(el.scrollWidth > el.clientWidth + 1);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ordered.length]);

  // Close the folder color menu on outside click (ref check — a native
  // document listener isn't stopped by React's synthetic stopPropagation).
  useEffect(() => {
    if (!colorMenu) return;
    const onDown = (e: MouseEvent) => {
      if (!colorMenuRef.current?.contains(e.target as Node)) setColorMenu(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [colorMenu]);

  // Close the overflow dropdown on outside click.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  // Folder color picker (shown on right-click, in both orientations).
  const colorMenuEl = colorMenu && (
    <div
      ref={colorMenuRef}
      className="fixed z-50 flex gap-1 rounded-md border border-border bg-bg-soft p-1.5 shadow-lg"
      style={{ left: colorMenu.x, top: colorMenu.y }}
    >
      {FOLDER_COLORS.map((c) => (
        <button
          key={c}
          onClick={() => {
            onSetFolderColor?.(colorMenu.id, c);
            setColorMenu(null);
          }}
          title={c}
          className="h-4 w-4 rounded-full border border-black/20 transition-transform hover:scale-110"
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  );

  function startRename(w: Workspace) {
    setEditingId(w.id);
    setDraft(w.name);
  }
  function commit() {
    if (editingId) onRename(editingId, draft.trim() || "Untitled");
    setEditingId(null);
  }

  const pinnedList = ordered.filter((w) => w.pinned);
  const unpinnedList = ordered.filter((w) => !w.pinned);

  // Shared editable name node (rename input vs. label).
  function nameNode(w: Workspace, maxClass: string) {
    return editingId === w.id ? (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setEditingId(null);
        }}
        className="w-24 rounded border border-accent bg-bg px-1 text-xs text-gray-100 focus:outline-none"
      />
    ) : (
      <span className={`truncate ${maxClass}`}>{w.name}</span>
    );
  }

  // --- Vertical sidebar list -------------------------------------------------
  if (orientation === "vertical") {
    const q = query.trim().toLowerCase();
    const matches = (w: Workspace) => !q || w.name.toLowerCase().includes(q);
    const visible = ordered.filter(matches);
    const loose = visible.filter((w) => !w.folderId);
    const loosePinned = loose.filter((w) => w.pinned);
    const looseRest = loose.filter((w) => !w.pinned);

    function startRenameFolder(f: Folder) {
      setEditingFolderId(f.id);
      setFolderDraft(f.name);
    }
    function commitFolder() {
      if (editingFolderId) onRenameFolder?.(editingFolderId, folderDraft.trim() || "Folder");
      setEditingFolderId(null);
    }

    const tabRow = (w: Workspace, inFolder: boolean) => {
      // Highlight the active editor of either pane (open on the left/right/both).
      const active = w.id === activeId || !!openSides?.[w.id];
      return (
        <div
          key={w.id}
          draggable={editingId !== w.id}
          onDragStart={(e) => {
            dragId.current = w.id;
            e.dataTransfer.effectAllowed = "move";
            // Allow dropping onto the editor's left/right zones.
            e.dataTransfer.setData("application/x-workspace-id", w.id);
          }}
          onDragEnd={() => {
            dragId.current = null;
            setDragOver(null);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            if (dragId.current && dragId.current !== w.id) setDragOver(w.id);
          }}
          onDragLeave={() => setDragOver((d) => (d === w.id ? null : d))}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const d = dragId.current;
            setDragOver(null);
            if (d && d !== w.id) onGroupTabs?.(d, w.id);
          }}
          onClick={() => onSwitch(w.id)}
          onDoubleClick={() => startRename(w)}
          title={`${w.name} — drag onto another tab to group`}
          className={`group flex cursor-pointer items-center gap-1.5 py-1 text-xs transition-colors ${
            inFolder ? "pl-3 pr-2" : "px-2"
          } ${
            active
              ? "bg-bg-softer text-gray-100"
              : "text-gray-400 hover:bg-bg-soft hover:text-gray-200"
          } ${dragOver === w.id ? "ring-1 ring-inset ring-accent" : ""}`}
        >
          <span
            className={`shrink-0 ${
              openSides?.[w.id]
                ? "text-accent"
                : active
                  ? "text-blue-600 dark:text-yellow-400"
                  : "text-gray-500"
            }`}
            title={
              openSides?.[w.id]
                ? `Open ${openSides[w.id] === "both" ? "in both panes" : `on the ${openSides[w.id]}`}`
                : undefined
            }
          >
            {openSides?.[w.id] === "left" ? (
              <PanelLeft size={12} />
            ) : openSides?.[w.id] === "right" ? (
              <PanelRight size={12} />
            ) : openSides?.[w.id] === "both" ? (
              <Columns2 size={12} />
            ) : w.pinned ? (
              <Pin size={12} className="fill-current" />
            ) : (
              <Braces size={12} />
            )}
          </span>
          {nameNode(w, "flex-1")}
          {(!inFolder || w.pinned) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin(w.id);
              }}
              title={w.pinned ? "Unpin workspace" : "Pin workspace"}
              className="flex h-4 w-4 items-center justify-center rounded-full text-gray-500 opacity-0 hover:bg-bg hover:text-gray-200 group-hover:opacity-100"
            >
              {w.pinned ? <PinOff size={11} /> : <Pin size={11} />}
            </button>
          )}
          {onOpenSide && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenSide(w.id);
              }}
              title="Open to the side"
              aria-label="Open to the side"
              className={`flex h-4 w-4 items-center justify-center rounded-full text-gray-500 hover:bg-bg hover:text-gray-200 ${
                active ? "" : "opacity-0 group-hover:opacity-100"
              }`}
            >
              <Columns2 size={11} />
            </button>
          )}
          <button
            onClick={async (e) => {
              e.stopPropagation();
              const { confirmed } = await confirm({
                title: `Delete "${w.name}"?`,
                description:
                  "This workspace will be permanently removed. This can't be undone.",
                confirmLabel: "Delete",
                danger: true,
                dontAskKey: "kuya-json:skip-delete-confirm",
              });
              if (confirmed) onClose(w.id);
            }}
            title="Delete workspace"
            className={`flex h-4 w-4 items-center justify-center rounded-full text-gray-500 hover:bg-bg hover:text-red-300 ${
              active ? "" : "opacity-0 group-hover:opacity-100"
            }`}
          >
            <Trash2 size={11} />
          </button>
        </div>
      );
    };

    return (
      <div className="flex h-full min-h-0 flex-col bg-bg-soft">
        <div className="flex items-center gap-1.5 border-b border-border px-2 py-1.5">
          <div className="relative flex-1">
            <Search
              size={12}
              className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-gray-500"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setQuery("");
              }}
              placeholder="Search workspaces…"
              className="w-full rounded border border-border bg-bg py-1 pl-7 pr-6 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-accent"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-200"
                aria-label="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>
          <button
            onClick={() => onAdd()}
            title="New workspace"
            aria-label="New workspace"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-base text-gray-400 hover:bg-bg-softer hover:text-gray-200"
          >
            +
          </button>
        </div>
        <div
          className="min-h-0 flex-1 overflow-y-auto py-1"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const d = dragId.current;
            setDragOver(null);
            if (d) onMoveToFolder?.(d, null); // drop on empty area → ungroup
          }}
        >
          {loosePinned.length > 0 && (
            <div>
              <div
                onClick={() => setPinnedCollapsed((c) => !c)}
                title="Pinned"
                className="flex cursor-pointer items-center gap-1 px-2 py-1 text-xs font-medium text-gray-300 hover:bg-bg-soft"
              >
                {pinnedCollapsed ? (
                  <ChevronRight size={12} />
                ) : (
                  <ChevronDown size={12} />
                )}
                <Pin size={13} className="shrink-0 fill-current text-red-500" />
                <span className="flex-1 truncate">Pinned</span>
              </div>
              {!pinnedCollapsed && (
                <div className="ml-[15px] border-l border-border">
                  {loosePinned.map((w) => tabRow(w, true))}
                </div>
              )}
              <div className="mx-2 my-1 border-t border-border" />
            </div>
          )}

          {folders.map((f) => {
            const members = workspaces.filter(
              (w) => w.folderId === f.id && matches(w),
            );
            if (q && members.length === 0) return null;
            const over = dragOver === `folder:${f.id}`;
            const color = f.color ?? DEFAULT_FOLDER_COLOR;
            return (
              <div key={f.id}>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragId.current) setDragOver(`folder:${f.id}`);
                  }}
                  onDragLeave={() =>
                    setDragOver((d) => (d === `folder:${f.id}` ? null : d))
                  }
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const d = dragId.current;
                    setDragOver(null);
                    if (d) onMoveToFolder?.(d, f.id);
                  }}
                  onClick={() => onToggleFolder?.(f.id)}
                  onDoubleClick={() => startRenameFolder(f)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setColorMenu({ id: f.id, x: e.clientX, y: e.clientY });
                  }}
                  title="Click to collapse · double-click to rename · right-click for color"
                  className={`group flex cursor-pointer items-center gap-1 px-2 py-1 text-xs font-medium text-gray-300 hover:bg-bg-soft ${
                    over ? "ring-1 ring-inset ring-accent" : ""
                  }`}
                >
                  {f.collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                  <span className="relative flex shrink-0 items-center justify-center">
                    <FolderIcon size={18} className="fill-current" style={{ color }} />
                    <span
                      className="pointer-events-none absolute text-[8px] font-bold text-white"
                      style={{
                        left: 0,
                        right: 0,
                        top: "33%",
                        textAlign: "center",
                        lineHeight: 1,
                      }}
                    >
                      {members.length}
                    </span>
                  </span>
                  {editingFolderId === f.id ? (
                    <input
                      ref={folderInputRef}
                      value={folderDraft}
                      onChange={(e) => setFolderDraft(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onBlur={commitFolder}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitFolder();
                        if (e.key === "Escape") setEditingFolderId(null);
                      }}
                      className="w-24 rounded border border-accent bg-bg px-1 text-xs text-gray-100 focus:outline-none"
                    />
                  ) : (
                    <span className="flex-1 truncate">{f.name}</span>
                  )}
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      const { confirmed, checked } = await confirm({
                        title: `Delete folder "${f.name}"?`,
                        description:
                          "By default the tabs are kept (ungrouped). Check below to delete them too.",
                        confirmLabel: "Delete",
                        danger: true,
                        checkboxLabel: "Include contents (delete its tabs)",
                      });
                      if (confirmed) onDeleteFolder?.(f.id, checked);
                    }}
                    title="Delete folder"
                    className="flex h-4 w-4 items-center justify-center rounded-full text-gray-500 opacity-0 hover:bg-bg hover:text-red-300 group-hover:opacity-100"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
                {!f.collapsed && (
                  <div
                    className="ml-[15px] border-l"
                    style={{ borderColor: `${color}66` }}
                  >
                    {members.map((w) => tabRow(w, true))}
                  </div>
                )}
              </div>
            );
          })}

          {looseRest.map((w) => tabRow(w, false))}
        </div>
        {colorMenuEl}
      </div>
    );
  }

  // --- Horizontal tab bar ----------------------------------------------------
  function startRenameFolderH(f: Folder) {
    setEditingFolderId(f.id);
    setFolderDraft(f.name);
  }
  function commitFolderH() {
    if (editingFolderId) onRenameFolder?.(editingFolderId, folderDraft.trim() || "Folder");
    setEditingFolderId(null);
  }

  // A single horizontal tab. Dragging one onto another groups them into a folder.
  const hTab = (w: Workspace) => {
    const active = w.id === activeId;
    return (
      <div
        key={w.id}
        draggable={editingId !== w.id}
        onDragStart={(e) => {
          dragId.current = w.id;
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("application/x-workspace-id", w.id);
        }}
        onDragEnd={() => {
          dragId.current = null;
          setDragOver(null);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!dragId.current || dragId.current === w.id) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const pos =
            x < rect.width * 0.3
              ? "before"
              : x > rect.width * 0.7
                ? "after"
                : "group";
          setDragOver(w.id);
          setDragPos(pos);
        }}
        onDragLeave={() => setDragOver((d) => (d === w.id ? null : d))}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const d = dragId.current;
          setDragOver(null);
          if (!d || d === w.id) return;
          if (dragPos === "group") onGroupTabs?.(d, w.id);
          else onReorder?.(d, w.id, dragPos === "before");
        }}
        onClick={() => onSwitch(w.id)}
        onDoubleClick={() => startRename(w)}
        title={`${w.name} — drag to reorder · drop on its center to group · onto the editor to split`}
        className={`group relative flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-t-lg px-3 text-xs transition-colors ${
          active
            ? "ctab-active z-10 -mb-px bg-bg-softer text-gray-100"
            : "bg-transparent text-gray-400 hover:bg-bg-soft hover:text-gray-200"
        } ${
          dragOver === w.id && dragPos === "group" ? "ring-1 ring-inset ring-accent" : ""
        } ${dragOver === w.id && dragPos === "before" ? "border-l-2 border-accent" : ""} ${
          dragOver === w.id && dragPos === "after" ? "border-r-2 border-accent" : ""
        }`}
      >
        <span
          className={`shrink-0 ${
            active ? "text-blue-600 dark:text-yellow-400" : "text-gray-500"
          }`}
        >
          {w.pinned ? (
            <Pin size={12} className="fill-current" />
          ) : (
            <Braces size={12} />
          )}
        </span>
        {editingId === w.id ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") setEditingId(null);
            }}
            className="w-24 rounded border border-accent bg-bg px-1 text-xs text-gray-100 focus:outline-none"
          />
        ) : (
          <span className="max-w-[150px] truncate">{w.name}</span>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin(w.id);
          }}
          title={w.pinned ? "Unpin workspace" : "Pin workspace"}
          className={`flex h-4 w-4 items-center justify-center rounded-full text-gray-500 hover:bg-bg hover:text-gray-200 ${
            w.pinned || active ? "" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          {w.pinned ? <PinOff size={11} /> : <Pin size={11} />}
        </button>
        <button
          onClick={async (e) => {
            e.stopPropagation();
            const { confirmed } = await confirm({
              title: `Delete "${w.name}"?`,
              description:
                "This workspace will be permanently removed. This can't be undone.",
              confirmLabel: "Delete",
              danger: true,
              dontAskKey: "kuya-json:skip-delete-confirm",
            });
            if (confirmed) onClose(w.id);
          }}
          title="Delete workspace"
          className={`flex h-4 w-4 items-center justify-center rounded-full text-gray-500 hover:bg-bg hover:text-red-300 ${
            active ? "" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <X size={12} />
        </button>
      </div>
    );
  };

  const hLoose = ordered.filter((w) => !w.folderId);
  const hFolders = folders
    .map((f) => ({ f, members: ordered.filter((w) => w.folderId === f.id) }))
    .filter((g) => g.members.length > 0);

  return (
    <div className="flex items-end bg-bg pr-1">
      <div
        ref={scrollRef}
        onDragOver={(e) => {
          if (dragId.current) e.preventDefault();
        }}
        onDrop={(e) => {
          e.preventDefault();
          const d = dragId.current;
          setDragOver(null);
          // Dropped on empty strip area (outside any folder) → ungroup.
          if (d) onMoveToFolder?.(d, null);
        }}
        className="flex flex-1 items-end gap-1 overflow-x-auto overflow-y-hidden px-2 pt-1.5"
      >
        {hLoose.map(hTab)}
        {hFolders.map(({ f, members }) => {
          const color = f.color ?? DEFAULT_FOLDER_COLOR;
          return (
            <div
              key={f.id}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragId.current) setDragOver(`folder:${f.id}`);
              }}
              onDragLeave={() =>
                setDragOver((d) => (d === `folder:${f.id}` ? null : d))
              }
              onDrop={(e) => {
                e.preventDefault();
                const d = dragId.current;
                setDragOver(null);
                if (d) onMoveToFolder?.(d, f.id);
              }}
              title={f.name}
              style={{ borderColor: `${color}66`, backgroundColor: `${color}14` }}
              className={`flex items-end gap-0.5 self-stretch rounded-t-lg border-x border-t px-1 ${
                dragOver === `folder:${f.id}` ? "ring-1 ring-inset ring-accent" : ""
              }`}
            >
              <span
                onClick={() => onToggleFolder?.(f.id)}
                onDoubleClick={() => startRenameFolderH(f)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setColorMenu({ id: f.id, x: e.clientX, y: e.clientY });
                }}
                title="Click to collapse · double-click to rename · right-click for color"
                style={{ color }}
                className="flex cursor-pointer items-center gap-1 self-center px-1 text-[10px] font-medium"
              >
                {f.collapsed ? (
                  <ChevronRight size={11} />
                ) : (
                  <FolderIcon size={11} className="fill-current" />
                )}
                {editingFolderId === f.id ? (
                  <input
                    ref={folderInputRef}
                    value={folderDraft}
                    onChange={(e) => setFolderDraft(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onBlur={commitFolderH}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitFolderH();
                      if (e.key === "Escape") setEditingFolderId(null);
                    }}
                    className="w-20 rounded border border-accent bg-bg px-1 text-[10px] text-gray-100 focus:outline-none"
                  />
                ) : (
                  <span className="max-w-[90px] truncate">{f.name}</span>
                )}
                {f.collapsed && (
                  <span className="tabular-nums opacity-70">{members.length}</span>
                )}
              </span>
              {!f.collapsed && members.map(hTab)}
            </div>
          );
        })}
        <button
          onClick={() => onAdd()}
          title="New workspace"
          className="mb-1 ml-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-base text-gray-400 hover:bg-bg-soft hover:text-gray-200"
        >
          +
        </button>
      </div>

      {/* Overflow dropdown: appears when tabs don't all fit. */}
      {overflowing && (
        <div ref={menuRef} className="relative mb-1 shrink-0">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            title="Show all workspaces"
            className="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-bg-soft hover:text-gray-200"
          >
            <ChevronDown size={16} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full z-30 mt-1 max-h-80 w-56 overflow-y-auto rounded-md border border-border bg-bg-soft py-1 shadow-lg">
              {pinnedList.length > 0 && (
                <>
                  <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                    Pinned
                  </div>
                  {pinnedList.map((w) => (
                    <MenuRow
                      key={w.id}
                      w={w}
                      active={w.id === activeId}
                      onSwitch={() => {
                        onSwitch(w.id);
                        setMenuOpen(false);
                      }}
                      onTogglePin={() => onTogglePin(w.id)}
                    />
                  ))}
                  <div className="my-1 border-t border-border" />
                </>
              )}
              {pinnedList.length > 0 && unpinnedList.length > 0 && (
                <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                  Tabs
                </div>
              )}
              {unpinnedList.map((w) => (
                <MenuRow
                  key={w.id}
                  w={w}
                  active={w.id === activeId}
                  onSwitch={() => {
                    onSwitch(w.id);
                    setMenuOpen(false);
                  }}
                  onTogglePin={() => onTogglePin(w.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {colorMenuEl}
    </div>
  );
}

function MenuRow({
  w,
  active,
  onSwitch,
  onTogglePin,
}: {
  w: Workspace;
  active: boolean;
  onSwitch: () => void;
  onTogglePin: () => void;
}) {
  return (
    <div
      onClick={onSwitch}
      className={`group flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs ${
        active ? "bg-bg-softer text-gray-100" : "text-gray-300 hover:bg-bg-softer"
      }`}
    >
      <span className="shrink-0 text-gray-500">
        {w.pinned ? <Pin size={12} className="fill-current" /> : <Braces size={12} />}
      </span>
      <span className="flex-1 truncate">{w.name}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onTogglePin();
        }}
        title={w.pinned ? "Unpin" : "Pin"}
        className="text-gray-500 opacity-0 hover:text-gray-200 group-hover:opacity-100"
      >
        {w.pinned ? <PinOff size={12} /> : <Pin size={12} />}
      </button>
    </div>
  );
}
