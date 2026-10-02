"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";
import { Undo2, Redo2, X, Menu, CircleHelp } from "lucide-react";
import GlobalSearchModal from "@/components/GlobalSearchModal";
import InstallButton from "@/components/InstallButton";
import KuyaLogo from "@/components/KuyaLogo";
import InputPanel from "@/components/InputPanel";
import TreeSidebar from "@/components/TreeSidebar";
import SidebarPanel from "@/components/SidebarPanel";
import Preferences from "@/components/Preferences";
import SecondaryEditor from "@/components/SecondaryEditor";
import EditorDropZones from "@/components/EditorDropZones";
import Split from "@/components/Split";
import Tooltip from "@/components/Tooltip";
import QueryModal from "@/components/QueryModal";
import { ConsoleProvider } from "@/components/console";
import { DocumentActionsProvider } from "@/components/DocumentActions";
import { SidebarToggleProvider } from "@/components/SidebarToggle";
import { ConfirmProvider } from "@/components/ConfirmDialog";
import { ZenContext } from "@/components/zen";
import Tour from "@/components/Tour";
import ProTip from "@/components/ProTip";
import { Button, ToastProvider } from "@/components/ui";
import type { JsonEditorHandle } from "@/components/JsonEditor";
import { TOOLS } from "@/components/tools/registry";
import type { ToolId } from "@/components/tools/types";
import { useHistory } from "@/lib/history";
import { usePreferences } from "@/lib/usePreferences";
import { nextFolderColor } from "@/lib/folderColors";
import { locateAll } from "@/lib/json/locate";
import { validate } from "@/lib/json/validate";
import { JSONPath } from "jsonpath-plus";
import {
  loadState,
  saveState,
  uuid,
  type Workspace,
  type Folder,
  type Group,
} from "@/lib/persist";

const ToolHost = dynamic(() => import("@/components/ToolHost"), { ssr: false });

/** Derive a short workspace name from the last segment of a JSONPath. */
function nameFromPath(path: string): string {
  const m = path.match(/(?:\.([\w$]+)|\[(\d+)\]|\['([^']+)'\])\s*$/);
  if (!m) return "subtree";
  if (m[1]) return m[1];
  if (m[2] != null) return `[${m[2]}]`;
  return m[3] ?? "subtree";
}

/** True when the viewport is at the `lg` breakpoint (1024px) or wider. */
function useIsDesktop() {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return desktop;
}

export default function Page() {
  const history = useHistory("");
  const historyB = useHistory("");
  // Editor groups (panes): each has its own open editors + active one.
  const [groups, setGroups] = useState<Group[]>([{ openIds: [], activeId: "" }]);
  const [focused, setFocused] = useState(0);
  const focusedRef = useRef(0);
  focusedRef.current = focused;
  const [active, setActive] = useState<ToolId>("format");
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [mobileTreeOpen, setMobileTreeOpen] = useState(false);
  const [queryOpen, setQueryOpen] = useState(false);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [onboardOpen, setOnboardOpen] = useState(false);
  const [treeCollapsed, setTreeCollapsed] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const inputEditor = useRef<JsonEditorHandle | null>(null);
  const { prefs, setPref } = usePreferences();

  // Zen mode swaps the whole app to its Japanese-style typefaces (globals.css).
  useEffect(() => {
    document.documentElement.classList.toggle("zen", prefs.zenMode);
  }, [prefs.zenMode]);

  useEffect(() => {
    setTreeCollapsed(localStorage.getItem("tree:collapsed") === "1");
  }, []);
  const collapseTree = useCallback((v: boolean) => {
    setTreeCollapsed(v);
    localStorage.setItem("tree:collapsed", v ? "1" : "0");
  }, []);

  const tool = TOOLS.find((t) => t.id === active)!;
  const showTree = !tool.ownInput; // Diff manages its own inputs.
  const isDesktop = useIsDesktop();

  const leftActiveId = groups[0]?.activeId ?? "";
  const rightActiveId = groups[1]?.activeId ?? "";
  const splitActive = groups.length === 2 && isDesktop;
  // Explorer sidebar present (vertical tabs): editor ✕ closes; otherwise deletes.
  const explorerActive = prefs.verticalTabs && isDesktop && !prefs.zenMode;

  // Which pane each workspace is the active (shown) editor of — for the
  // Explorer side indicator (only the visible workspace of each pane).
  const openSides = useMemo(() => {
    const m: Record<string, "left" | "right" | "both"> = {};
    const l = groups[0]?.activeId;
    const r = groups[1]?.activeId;
    if (l) m[l] = "left";
    if (r) m[r] = m[r] === "left" ? "both" : "right";
    return m;
  }, [groups]);

  const locations = useMemo(() => locateAll(history.value), [history.value]);

  const onSelectPath = useCallback(
    (path: string) => {
      setSelectedPath(path);
      const range = locations.get(path);
      if (range) inputEditor.current?.focusRange(range.from, range.to);
      setMobileTreeOpen(false);
    },
    [locations],
  );

  // Editor cursor moved → show the JSON path (breadcrumbs) at that offset.
  const onEditorCursor = useCallback(
    (offset: number) => {
      let bestPath: string | null = null;
      let bestSize = Infinity;
      for (const [path, r] of locations) {
        if (offset >= r.from && offset <= r.to) {
          const size = r.to - r.from;
          if (size < bestSize) {
            bestSize = size;
            bestPath = path;
          }
        }
      }
      setSelectedPath(bestPath);
    },
    [locations],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const k = e.key.toLowerCase();
      if (k === "f" && e.shiftKey) {
        // Search across all workspaces.
        e.preventDefault();
        setGlobalSearchOpen(true);
      } else if (k === "k" || k === "f") {
        // Search the opened document.
        e.preventDefault();
        setQueryOpen((o) => (k === "f" ? true : !o));
      } else if (k === "z" && !e.shiftKey) {
        e.preventDefault();
        history.undo();
      } else if ((k === "z" && e.shiftKey) || k === "y") {
        e.preventDefault();
        history.redo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [history]);

  // Show onboarding on first visit.
  useEffect(() => {
    if (!localStorage.getItem("kuya-json:onboarded")) setOnboardOpen(true);
  }, []);
  const closeOnboarding = useCallback(() => {
    setOnboardOpen(false);
    localStorage.setItem("kuya-json:onboarded", "1");
  }, []);

  // Restore workspaces (or migrate the old single-doc localStorage) on load.
  const loaded = useRef(false);
  useEffect(() => {
    (async () => {
      let state = await loadState();
      if (!state || state.workspaces.length === 0) {
        let content = "";
        let tool = "format";
        try {
          content = localStorage.getItem("kuya-json:doc") ?? "";
          tool = localStorage.getItem("kuya-json:tool") ?? "format";
        } catch {
          /* no legacy data */
        }
        const id = uuid();
        state = {
          workspaces: [{ id, name: "Workspace 1", content }],
          activeId: id,
          activeTool: tool,
        };
      }
      setWorkspaces(state.workspaces);
      setFolders(state.folders ?? []);
      // Migrate older saves (no groups) into a single group with all docs open.
      const initialGroups: Group[] = state.groups ?? [
        { openIds: state.workspaces.map((w) => w.id), activeId: state.activeId },
      ];
      setGroups(initialGroups);
      setFocused(state.focused ?? 0);
      if (TOOLS.some((t) => t.id === state.activeTool)) {
        setActive(state.activeTool as ToolId);
      }
      loaded.current = true;
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load each group's active workspace content into its editor history.
  useEffect(() => {
    const w = workspaces.find((x) => x.id === leftActiveId);
    history.reset(w?.content ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leftActiveId]);
  useEffect(() => {
    const w = workspaces.find((x) => x.id === rightActiveId);
    historyB.reset(w?.content ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rightActiveId]);

  // Sync each pane's edits back to its workspace.
  useEffect(() => {
    if (!loaded.current || !leftActiveId) return;
    setWorkspaces((ws) =>
      ws.map((w) =>
        w.id === leftActiveId && w.content !== history.value
          ? { ...w, content: history.value }
          : w,
      ),
    );
  }, [history.value, leftActiveId]);
  useEffect(() => {
    if (!loaded.current || !rightActiveId) return;
    setWorkspaces((ws) =>
      ws.map((w) =>
        w.id === rightActiveId && w.content !== historyB.value
          ? { ...w, content: historyB.value }
          : w,
      ),
    );
  }, [historyB.value, rightActiveId]);

  // Persist everything (debounced) to IndexedDB.
  useEffect(() => {
    if (!loaded.current || workspaces.length === 0) return;
    const id = window.setTimeout(() => {
      saveState({
        workspaces,
        activeId: groups[0]?.activeId ?? "",
        activeTool: active,
        folders,
        groups,
        focused,
      });
    }, 400);
    return () => window.clearTimeout(id);
  }, [workspaces, groups, focused, active, folders]);

  // --- editor group actions ---
  // Open a file (workspace) in a group, creating the right group if needed.
  const openInGroup = useCallback((fileId: string, g: number) => {
    setGroups((prev) => {
      const next = [...prev];
      if (g === 1 && next.length < 2) next.push({ openIds: [], activeId: "" });
      const grp = next[g];
      if (!grp) return prev;
      const openIds = grp.openIds.includes(fileId)
        ? grp.openIds
        : [...grp.openIds, fileId];
      next[g] = { openIds, activeId: fileId };
      return next;
    });
    setFocused(g);
    setSelectedPath(null);
  }, []);

  // Move an open editor from its current group into another group.
  const moveEditorToGroup = useCallback(
    (id: string, targetG: number) => {
      let next = groups.map((grp) => {
        const openIds = grp.openIds.filter((x) => x !== id);
        const activeId =
          grp.activeId === id ? (openIds[openIds.length - 1] ?? "") : grp.activeId;
        return { openIds, activeId };
      });
      if (targetG === 1 && next.length < 2) next.push({ openIds: [], activeId: "" });
      const t = next[targetG];
      if (!t) return;
      next[targetG] = {
        openIds: t.openIds.includes(id) ? t.openIds : [...t.openIds, id],
        activeId: id,
      };
      let newFocused = targetG;
      if (next.length === 2) {
        if (next[1].openIds.length === 0) {
          next = [next[0]];
          newFocused = 0;
        } else if (next[0].openIds.length === 0) {
          next = [next[1]];
          newFocused = 0;
        }
      }
      setGroups(next);
      setFocused(newFocused);
    },
    [groups],
  );

  // Close an open editor in a group (the file stays in the Explorer).
  const closeEditor = useCallback((g: number, fileId: string) => {
    setGroups((prev) => {
      const grp = prev[g];
      if (!grp) return prev;
      const openIds = grp.openIds.filter((id) => id !== fileId);
      if (openIds.length === 0) {
        // Group emptied: collapse to the remaining group, or a blank one.
        if (prev.length === 2) {
          setFocused(0);
          return g === 1 ? [prev[0]] : [prev[1]];
        }
        return [{ openIds: [], activeId: "" }];
      }
      let activeId = grp.activeId;
      if (activeId === fileId) {
        const idx = grp.openIds.indexOf(fileId);
        activeId = openIds[Math.max(0, idx - 1)] ?? openIds[0];
      }
      const next = [...prev];
      next[g] = { openIds, activeId };
      return next;
    });
  }, []);

  const closeGroup = useCallback((g: number) => {
    setGroups((prev) => (prev.length === 2 ? (g === 1 ? [prev[0]] : [prev[1]]) : prev));
    setFocused(0);
  }, []);

  const addWorkspace = useCallback(
    (content = "", name?: string) => {
      const id = uuid();
      setWorkspaces((ws) => [
        ...ws,
        { id, name: name ?? `Workspace ${ws.length + 1}`, content },
      ]);
      openInGroup(id, focusedRef.current);
    },
    [openInGroup],
  );

  // New file opened directly in a given group (group's "+" button).
  const newFileInGroup = useCallback(
    (g: number) => {
      const id = uuid();
      setWorkspaces((ws) => [
        ...ws,
        { id, name: `Workspace ${ws.length + 1}`, content: "" },
      ]);
      openInGroup(id, g);
    },
    [openInGroup],
  );

  // Open a node's subtree (resolved by JSONPath) in a new workspace.
  const openSubtree = useCallback(
    (path: string) => {
      const v = validate(history.value);
      if (!v.ok) return;
      let value: unknown;
      try {
        value = JSONPath({ path, json: v.value as object, wrap: false });
      } catch {
        return;
      }
      if (value === undefined) return;
      addWorkspace(JSON.stringify(value, null, 2), nameFromPath(path));
    },
    [history.value, addWorkspace],
  );

  // Delete a file entirely (Explorer trash): remove it from every group too.
  const deleteWorkspace = useCallback(
    (id: string) => {
      const remaining = workspaces.filter((w) => w.id !== id);
      if (remaining.length === 0) {
        const nid = uuid();
        setWorkspaces([{ id: nid, name: "Workspace 1", content: "" }]);
        setGroups([{ openIds: [nid], activeId: nid }]);
        setFocused(0);
        return;
      }
      setWorkspaces(remaining);
      // Drop folders left with no members.
      setFolders((fs) => fs.filter((f) => remaining.some((w) => w.folderId === f.id)));
      let g = groups.map((grp) => {
        const openIds = grp.openIds.filter((x) => x !== id);
        const activeId =
          grp.activeId === id ? (openIds[openIds.length - 1] ?? "") : grp.activeId;
        return { openIds, activeId };
      });
      if (g.length === 2) {
        if (g[1].openIds.length === 0) {
          g = [g[0]];
          setFocused(0);
        } else if (g[0].openIds.length === 0) {
          g = [g[1]];
          setFocused(0);
        }
      }
      setGroups(g);
    },
    [workspaces, groups],
  );

  const renameWorkspace = useCallback((id: string, name: string) => {
    setWorkspaces((ws) => ws.map((w) => (w.id === id ? { ...w, name } : w)));
  }, []);

  // Reorder a tab relative to a target (drag to rearrange).
  const reorderWorkspace = useCallback(
    (dragId: string, targetId: string, before: boolean) => {
      if (dragId === targetId) return;
      setWorkspaces((prev) => {
        const arr = [...prev];
        const from = arr.findIndex((w) => w.id === dragId);
        if (from < 0) return prev;
        const [moved] = arr.splice(from, 1);
        let to = arr.findIndex((w) => w.id === targetId);
        if (to < 0) return prev;
        if (!before) to += 1;
        arr.splice(to, 0, moved);
        return arr;
      });
    },
    [],
  );

  const togglePinWorkspace = useCallback((id: string) => {
    setWorkspaces((ws) =>
      ws.map((w) => (w.id === id ? { ...w, pinned: !w.pinned } : w)),
    );
  }, []);

  // Drop one tab onto another → group them into a folder (or join the target's).
  const groupTabs = useCallback(
    (dragId: string, targetId: string) => {
      if (dragId === targetId) return;
      const target = workspaces.find((w) => w.id === targetId);
      const drag = workspaces.find((w) => w.id === dragId);
      if (!target || !drag) return;
      if (drag.folderId && drag.folderId === target.folderId) return;
      let folderId = target.folderId;
      let newFolder: Folder | null = null;
      if (!folderId) {
        folderId = uuid();
        newFolder = {
          id: folderId,
          name: "New folder",
          collapsed: false,
          color: nextFolderColor(folders.map((f) => f.color)),
        };
      }
      const next = workspaces.map((w) =>
        w.id === dragId
          ? { ...w, folderId, pinned: false }
          : w.id === targetId
            ? { ...w, folderId }
            : w,
      );
      setWorkspaces(next);
      // Add the new folder and drop any that are now empty (e.g. the source).
      setFolders((fs) => {
        const withNew = newFolder ? [...fs, newFolder] : fs;
        return withNew.filter((f) => next.some((w) => w.folderId === f.id));
      });
    },
    [workspaces, folders],
  );

  // Move a tab into a folder, or out of any folder (folderId = null).
  const moveToFolder = useCallback(
    (id: string, folderId: string | null) => {
      const next = workspaces.map((w) =>
        w.id === id ? { ...w, folderId: folderId ?? undefined } : w,
      );
      setWorkspaces(next);
      // Remove folders left with no members.
      setFolders((fs) => fs.filter((f) => next.some((w) => w.folderId === f.id)));
    },
    [workspaces],
  );

  // Remove a folder. By default its members are ungrouped (kept); when
  // `deleteContents` is true the member workspaces are deleted too.
  const deleteFolder = useCallback(
    (id: string, deleteContents = false) => {
      setFolders((fs) => fs.filter((f) => f.id !== id));
      if (!deleteContents) {
        setWorkspaces((ws) =>
          ws.map((w) => (w.folderId === id ? { ...w, folderId: undefined } : w)),
        );
        return;
      }
      const deleted = new Set(
        workspaces.filter((w) => w.folderId === id).map((w) => w.id),
      );
      const remaining = workspaces.filter((w) => !deleted.has(w.id));
      if (remaining.length === 0) {
        const nid = uuid();
        setWorkspaces([{ id: nid, name: "Workspace 1", content: "" }]);
        setGroups([{ openIds: [nid], activeId: nid }]);
        setFocused(0);
        return;
      }
      setWorkspaces(remaining);
      let g = groups.map((grp) => {
        const openIds = grp.openIds.filter((x) => !deleted.has(x));
        const activeId = deleted.has(grp.activeId)
          ? (openIds[openIds.length - 1] ?? "")
          : grp.activeId;
        return { openIds, activeId };
      });
      if (g.length === 2) {
        if (g[1].openIds.length === 0) {
          g = [g[0]];
          setFocused(0);
        } else if (g[0].openIds.length === 0) {
          g = [g[1]];
          setFocused(0);
        }
      }
      setGroups(g);
    },
    [workspaces, groups],
  );

  const renameFolder = useCallback((id: string, name: string) => {
    setFolders((fs) =>
      fs.map((f) => (f.id === id ? { ...f, name: name.trim() || "Folder" } : f)),
    );
  }, []);

  const toggleFolder = useCallback((id: string) => {
    setFolders((fs) =>
      fs.map((f) => (f.id === id ? { ...f, collapsed: !f.collapsed } : f)),
    );
  }, []);

  const setFolderColor = useCallback((id: string, color: string) => {
    setFolders((fs) => fs.map((f) => (f.id === id ? { ...f, color } : f)));
  }, []);

  // The open editors of each group, in tab order.
  const groupWorkspaces = (g: number): Workspace[] => {
    const grp = groups[g];
    if (!grp) return [];
    return grp.openIds
      .map((id) => workspaces.find((w) => w.id === id))
      .filter((w): w is Workspace => !!w);
  };

  const leftPane = (
    <div
      className="relative h-full min-h-0"
      onMouseDownCapture={() => setFocused(0)}
    >
      {splitActive && (
        <button
          onClick={() => closeGroup(0)}
          title="Close left pane"
          aria-label="Close left pane"
          className="absolute right-1.5 top-1.5 z-20 flex h-6 w-6 items-center justify-center rounded-md text-gray-400 hover:bg-bg-softer hover:text-danger"
        >
          <X size={14} />
        </button>
      )}
      <InputPanel
        value={history.value}
        onChange={history.set}
        onReset={history.set}
        editorRef={inputEditor}
        selectedPath={selectedPath}
        onSelectPath={onSelectPath}
        onDeselect={() => setSelectedPath(null)}
        onCursor={onEditorCursor}
        workspaces={
          explorerActive
            ? groupWorkspaces(0)
            : splitActive
              ? workspaces.filter(
                  (w) => !(groups[1]?.openIds ?? []).includes(w.id),
                )
              : workspaces
        }
        activeId={leftActiveId}
        onSwitchWorkspace={(id) => openInGroup(id, 0)}
        onAddWorkspace={() => newFileInGroup(0)}
        onCloseWorkspace={(id) =>
          explorerActive ? closeEditor(0, id) : deleteWorkspace(id)
        }
        onRenameWorkspace={renameWorkspace}
        onTogglePinWorkspace={togglePinWorkspace}
        hideTabs={explorerActive}
        folders={folders}
        onGroupTabs={groupTabs}
        onMoveToFolder={moveToFolder}
        onRenameFolder={renameFolder}
        onToggleFolder={toggleFolder}
        onSetFolderColor={setFolderColor}
        onReorder={reorderWorkspace}
      />
    </div>
  );

  const documentEditor = (
    <EditorDropZones
      onDropLeft={(id) =>
        explorerActive ? openInGroup(id, 0) : moveEditorToGroup(id, 0)
      }
      onDropRight={(id) =>
        explorerActive ? openInGroup(id, 1) : moveEditorToGroup(id, 1)
      }
    >
      {splitActive ? (
        <Split
          direction="horizontal"
          initial={0.5}
          min={0.25}
          max={0.75}
          storageKey="doc-split"
          first={leftPane}
          second={
            <div className="h-full min-h-0" onMouseDownCapture={() => setFocused(1)}>
              <SecondaryEditor
                value={historyB.value}
                onChange={historyB.set}
                onReset={historyB.set}
                workspaces={groupWorkspaces(1)}
                activeId={rightActiveId}
                onSwitch={(id) => openInGroup(id, 1)}
                onAdd={() => newFileInGroup(1)}
                onClose={(id) =>
                  explorerActive ? closeEditor(1, id) : deleteWorkspace(id)
                }
                onRename={renameWorkspace}
                onTogglePin={togglePinWorkspace}
                onCloseSplit={() => closeGroup(1)}
                hideTabs={explorerActive}
              />
            </div>
          }
        />
      ) : (
        leftPane
      )}
    </EditorDropZones>
  );

  const workspace = (
    <ToolHost
      id={active}
      input={history.value}
      setInput={history.set}
      editor={documentEditor}
    />
  );

  return (
    <ZenContext.Provider value={prefs.zenMode}>
    <ToastProvider>
      <ConfirmProvider>
      <ConsoleProvider>
      <DocumentActionsProvider
        value={{
          value: history.value,
          onReset: history.set,
          onUndo: history.undo,
          onRedo: history.redo,
          canUndo: history.canUndo,
          canRedo: history.canRedo,
        }}
      >
      <SidebarToggleProvider
        value={{
          collapsed: treeCollapsed,
          toggle: () => collapseTree(!treeCollapsed),
          available: showTree && isDesktop && !prefs.zenMode,
          split: prefs.sidebarSplit,
          toggleSplit: () => setPref("sidebarSplit", !prefs.sidebarSplit),
          splitAvailable:
            showTree && isDesktop && !prefs.zenMode && prefs.verticalTabs,
        }}
      >
      <div className={`flex h-screen ${prefs.zenMode ? "flex-row" : "flex-col"}`}>
        <Header
          active={active}
          onSelect={setActive}
          showTreeToggle={showTree && !prefs.zenMode}
          onToggleTree={() => setMobileTreeOpen((o) => !o)}
          onUndo={history.undo}
          onRedo={history.redo}
          canUndo={history.canUndo}
          canRedo={history.canRedo}
          onOpenHelp={() => setOnboardOpen(true)}
          preferences={
            <Preferences
              prefs={prefs}
              setPref={setPref}
              align={prefs.zenMode ? "left" : "right"}
              bare={prefs.zenMode}
            />
          }
          zenMode={prefs.zenMode}
        />

        <main className="relative min-h-0 flex-1 overflow-hidden">
          {/* Mobile tree drawer */}
          {showTree && mobileTreeOpen && !prefs.zenMode && (
            <>
              <div
                className="fixed inset-0 z-30 bg-black/50 lg:hidden"
                onClick={() => setMobileTreeOpen(false)}
              />
              <aside className="fixed inset-y-0 left-0 z-40 w-72 border-r border-border shadow-xl lg:hidden">
                <TreeSidebar
                  input={history.value}
                  selectedPath={selectedPath}
                  onSelect={onSelectPath}
                  onOpenSubtree={openSubtree}
                  onClose={() => setMobileTreeOpen(false)}
                />
              </aside>
            </>
          )}

          {/* Desktop: resizable [tree | workspace]; mobile: workspace only.
              Rendered via JS breakpoint so the workspace mounts exactly once. */}
          {showTree && isDesktop && !prefs.zenMode ? (
            <Split
              direction="horizontal"
              initial={0.2}
              min={0.1}
              max={0.45}
              storageKey="sidebar"
              collapsed={treeCollapsed}
              first={
                  prefs.verticalTabs ? (
                    <SidebarPanel
                      workspaces={workspaces}
                      folders={folders}
                      activeId={groups[focused]?.activeId ?? ""}
                      onOpenWorkspace={(id) => openInGroup(id, focused)}
                      onAddWorkspace={addWorkspace}
                      onDeleteWorkspace={deleteWorkspace}
                      onRenameWorkspace={renameWorkspace}
                      onTogglePinWorkspace={togglePinWorkspace}
                      onGroupTabs={groupTabs}
                      onMoveToFolder={moveToFolder}
                      onDeleteFolder={deleteFolder}
                      onRenameFolder={renameFolder}
                      onToggleFolder={toggleFolder}
                      onSetFolderColor={setFolderColor}
                      onOpenSide={(id) => openInGroup(id, 1)}
                      openSides={openSides}
                      input={history.value}
                      selectedPath={selectedPath}
                      onSelectPath={onSelectPath}
                      onOpenSubtree={openSubtree}
                      split={prefs.sidebarSplit}
                    />
                  ) : (
                    <TreeSidebar
                      input={history.value}
                      selectedPath={selectedPath}
                      onSelect={onSelectPath}
                      onOpenSubtree={openSubtree}
                    />
                  )
                }
              second={workspace}
            />
          ) : (
            <div className="h-full">{workspace}</div>
          )}
        </main>
      </div>

      <QueryModal
        input={history.value}
        setInput={history.set}
        open={queryOpen}
        onClose={() => setQueryOpen(false)}
        focusRange={(from, to) =>
          inputEditor.current?.focusRange(from, to, { focus: false })
        }
        onSelectPath={onSelectPath}
      />

      <GlobalSearchModal
        open={globalSearchOpen}
        onClose={() => setGlobalSearchOpen(false)}
        workspaces={workspaces}
        activeId={leftActiveId}
        onJump={(id, from, to) => {
          const wasActive = id === leftActiveId;
          openInGroup(id, 0);
          setGlobalSearchOpen(false);
          // Let the editor settle, then select the match.
          setTimeout(
            () => inputEditor.current?.focusRange(from, to, { focus: false }),
            wasActive ? 0 : 80,
          );
        }}
      />

      <Tour open={onboardOpen} onClose={closeOnboarding} />
      <ProTip />
      </SidebarToggleProvider>
      </DocumentActionsProvider>
      </ConsoleProvider>
      </ConfirmProvider>
    </ToastProvider>
    </ZenContext.Provider>
  );
}

function Header({
  active,
  onSelect,
  showTreeToggle,
  onToggleTree,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onOpenHelp,
  preferences,
  zenMode,
}: {
  active: ToolId;
  onSelect: (id: ToolId) => void;
  showTreeToggle: boolean;
  onToggleTree: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onOpenHelp: () => void;
  preferences: ReactNode;
  zenMode: boolean;
}) {
  // Zen mode: the header becomes a left sidebar (in-flow, shrinks the editor),
  // with the Kuya logo at the very top. All controls are uniform borderless icons.
  if (zenMode) {
    const iconBtn =
      "flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-bg-softer hover:text-gray-200 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-400";
    return (
      <div className="flex h-full shrink-0 flex-col items-center gap-1 overflow-y-auto border-r border-border bg-bg-soft p-1.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-white">
          <KuyaLogo size={20} />
        </span>
        <div className="my-0.5 h-px w-6 bg-border" />
        {TOOLS.map((t) => (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            aria-label={t.label}
            className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
              active === t.id
                ? "bg-accent text-white"
                : "text-gray-400 hover:bg-bg-softer hover:text-gray-200"
            }`}
          >
            <t.icon size={16} />
          </button>
        ))}
        <div className="mt-auto flex flex-col items-center gap-1 pt-1">
          <div className="my-0.5 h-px w-6 bg-border" />
          <button onClick={onUndo} disabled={!canUndo} aria-label="Undo" className={iconBtn}>
            <Undo2 size={15} />
          </button>
          <button onClick={onRedo} disabled={!canRedo} aria-label="Redo" className={iconBtn}>
            <Redo2 size={15} />
          </button>
          <button onClick={onOpenHelp} aria-label="Help" className={iconBtn}>
            <CircleHelp size={15} aria-hidden="true" />
          </button>
          {preferences}
        </div>
      </div>
    );
  }

  return (
    <header className="sticky top-0 z-40 flex shrink-0 flex-col gap-2 border-b border-border bg-bg-soft/90 px-3 py-2 backdrop-blur sm:flex-row sm:items-center">
      <div className="flex items-center gap-2.5">
        {showTreeToggle && (
          <button
            onClick={onToggleTree}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-gray-300 hover:bg-bg-softer lg:hidden"
            aria-label="Toggle tree"
            title="Toggle structure tree"
          >
            <Menu size={16} aria-hidden="true" />
          </button>
        )}
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-white shadow-sm">
          <KuyaLogo size={18} />
        </span>
        <div className="flex h-7 flex-col justify-center leading-none">
          <span className="text-[15px] font-semibold leading-none tracking-tightish text-gray-100">
            Kuya Json
          </span>
          <span className="mt-0.5 text-[10px] font-normal leading-none text-gray-500">
            built by ep
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:ml-auto">
        <nav data-tour="tools" className="hidden gap-1 overflow-x-auto sm:flex">
          {TOOLS.map((t) => (
            <Tooltip key={t.id} text={t.info}>
              <button
                onClick={() => onSelect(t.id)}
                aria-label={t.label}
                data-tour={`tool-${t.id}`}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  active === t.id
                    ? "bg-accent text-white"
                    : "text-gray-400 hover:bg-bg-softer hover:text-gray-200"
                }`}
              >
                <t.icon size={15} />
                {t.label}
              </button>
            </Tooltip>
          ))}
        </nav>

        <select
          value={active}
          onChange={(e) => onSelect(e.target.value as ToolId)}
          className="rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-gray-200 sm:hidden"
        >
          {TOOLS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>

        <Button onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl/Cmd+Z)">
          <Undo2 size={15} />
        </Button>
        <Button onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl/Cmd+Shift+Z)">
          <Redo2 size={15} />
        </Button>
        <InstallButton />
        <Button onClick={onOpenHelp} title="Help / intro">
          ?
        </Button>
        {preferences}
      </div>
    </header>
  );
}
