"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Pin, PinOff, X, Braces } from "lucide-react";
import type { Workspace } from "@/lib/persist";

interface Props {
  workspaces: Workspace[];
  activeId: string;
  onSwitch: (id: string) => void;
  onAdd: () => void;
  onClose: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onTogglePin: (id: string) => void;
}

export default function WorkspaceTabs({
  workspaces,
  activeId,
  onSwitch,
  onAdd,
  onClose,
  onRename,
  onTogglePin,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [overflowing, setOverflowing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Pinned tabs render first, then the rest — both in original order.
  const ordered = useMemo(() => {
    const pinned = workspaces.filter((w) => w.pinned);
    const rest = workspaces.filter((w) => !w.pinned);
    return [...pinned, ...rest];
  }, [workspaces]);

  useEffect(() => {
    if (editingId) inputRef.current?.select();
  }, [editingId]);

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

  // Close the overflow dropdown on outside click.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

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

  return (
    <div className="flex items-end bg-bg pr-1">
      <div
        ref={scrollRef}
        className="flex flex-1 items-end gap-1 overflow-x-auto overflow-y-hidden px-2 pt-1.5"
      >
        {ordered.map((w) => {
          const active = w.id === activeId;
          return (
            <div
              key={w.id}
              onClick={() => onSwitch(w.id)}
              onDoubleClick={() => startRename(w)}
              title={`${w.name} — double-click to rename`}
              className={`group relative flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-t-lg px-3 text-xs transition-colors ${
                active
                  ? "ctab-active z-10 -mb-px bg-bg-softer text-gray-100"
                  : "bg-transparent text-gray-400 hover:bg-bg-soft hover:text-gray-200"
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
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(w.id);
                }}
                title="Close workspace"
                className={`flex h-4 w-4 items-center justify-center rounded-full text-gray-500 hover:bg-bg hover:text-red-300 ${
                  active ? "" : "opacity-0 group-hover:opacity-100"
                }`}
              >
                <X size={12} />
              </button>
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
