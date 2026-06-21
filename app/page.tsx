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
import { Undo2, Redo2 } from "lucide-react";
import GlobalSearchModal from "@/components/GlobalSearchModal";
import InstallButton from "@/components/InstallButton";
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
import { ZenContext } from "@/components/zen";
import Tour from "@/components/Tour";
import { Button, ToastProvider } from "@/components/ui";
import type { JsonEditorHandle } from "@/components/JsonEditor";
import { TOOLS } from "@/components/tools/registry";
import type { ToolId } from "@/components/tools/types";
import { useHistory } from "@/lib/history";
import { usePreferences } from "@/lib/usePreferences";
import { locateAll } from "@/lib/json/locate";
import { validate } from "@/lib/json/validate";
import { JSONPath } from "jsonpath-plus";
import {
  loadState,
  saveState,
  uuid,
  type Workspace,
  type Folder,
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
  const [splitId, setSplitId] = useState<string | null>(null);
  const [active, setActive] = useState<ToolId>("format");
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [mobileTreeOpen, setMobileTreeOpen] = useState(false);
  const [queryOpen, setQueryOpen] = useState(false);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [onboardOpen, setOnboardOpen] = useState(false);
  const [treeCollapsed, setTreeCollapsed] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const inputEditor = useRef<JsonEditorHandle | null>(null);
  const { prefs, setPref } = usePreferences();

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
      setActiveId(state.activeId);
      if (TOOLS.some((t) => t.id === state.activeTool)) {
        setActive(state.activeTool as ToolId);
      }
      const current =
        state.workspaces.find((w) => w.id === state.activeId) ??
        state.workspaces[0];
      history.reset(current?.content ?? "");
      loaded.current = true;
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the active workspace's content in sync with the editor.
  useEffect(() => {
    if (!loaded.current) return;
    setWorkspaces((ws) =>
      ws.map((w) =>
        w.id === activeId && w.content !== history.value
          ? { ...w, content: history.value }
          : w,
      ),
    );
  }, [history.value, activeId]);

  // Split (right pane): load the chosen workspace's content when it changes.
  useEffect(() => {
    if (!splitId) return;
    const w = workspaces.find((x) => x.id === splitId);
    historyB.reset(w?.content ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [splitId]);

  // Keep the split workspace's content in sync with the right pane editor.
  useEffect(() => {
    if (!loaded.current || !splitId) return;
    setWorkspaces((ws) =>
      ws.map((w) =>
        w.id === splitId && w.content !== historyB.value
          ? { ...w, content: historyB.value }
          : w,
      ),
    );
  }, [historyB.value, splitId]);

  // Persist everything (debounced) to IndexedDB.
  useEffect(() => {
    if (!loaded.current || workspaces.length === 0) return;
    const id = window.setTimeout(() => {
      saveState({ workspaces, activeId, activeTool: active, folders });
    }, 400);
    return () => window.clearTimeout(id);
  }, [workspaces, activeId, active, folders]);

  // --- workspace actions ---
  const switchWorkspace = useCallback(
    (id: string) => {
      if (id === activeId) return;
      const w = workspaces.find((x) => x.id === id);
      setActiveId(id);
      history.reset(w?.content ?? "");
      setSelectedPath(null);
      if (id === splitId) setSplitId(null); // can't be both panes
    },
    [activeId, workspaces, history, splitId],
  );

  // Open a workspace in the right (split) pane.
  const openSplit = useCallback(
    (id: string) => {
      if (id === activeId) return;
      setSplitId(id);
    },
    [activeId],
  );
  const closeSplit = useCallback(() => setSplitId(null), []);
  // Close the left pane: the right (split) workspace becomes the sole editor.
  const closeLeft = useCallback(() => {
    if (!splitId) return;
    const w = workspaces.find((x) => x.id === splitId);
    setActiveId(splitId);
    history.reset(w?.content ?? "");
    setSplitId(null);
    setSelectedPath(null);
  }, [splitId, workspaces, history]);
  // Add a new workspace and open it in the right (split) pane.
  const addToSplit = useCallback(() => {
    const id = uuid();
    setWorkspaces((ws) => [
      ...ws,
      { id, name: `Workspace ${ws.length + 1}`, content: "" },
    ]);
    setSplitId(id);
  }, []);

  const addWorkspace = useCallback(
    (content = "", name?: string) => {
      const id = uuid();
      setWorkspaces((ws) => [
        ...ws,
        { id, name: name ?? `Workspace ${ws.length + 1}`, content },
      ]);
      setActiveId(id);
      history.reset(content);
      setSelectedPath(null);
    },
    [history],
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

  const closeWorkspace = useCallback(
    (id: string) => {
      const idx = workspaces.findIndex((w) => w.id === id);
      const remaining = workspaces.filter((w) => w.id !== id);
      if (remaining.length === 0) {
        const nid = uuid();
        const fresh = { id: nid, name: "Workspace 1", content: "" };
        setWorkspaces([fresh]);
        setActiveId(nid);
        history.reset("");
        setSplitId(null);
        return;
      }
      setWorkspaces(remaining);

      let nextActiveId = activeId;
      if (id === activeId) {
        const next = remaining[Math.max(0, idx - 1)] ?? remaining[0];
        nextActiveId = next.id;
        setActiveId(next.id);
        history.reset(next.content);
        setSelectedPath(null);
      }

      // If the closed tab was shown in the right (split) pane, keep the split
      // open by moving it to a neighbor; only close the split if none remain.
      if (id === splitId) {
        const neighbor = remaining.find((w) => w.id !== nextActiveId);
        setSplitId(neighbor ? neighbor.id : null);
      }
    },
    [workspaces, activeId, history, splitId],
  );

  const renameWorkspace = useCallback((id: string, name: string) => {
    setWorkspaces((ws) => ws.map((w) => (w.id === id ? { ...w, name } : w)));
  }, []);

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
        newFolder = { id: folderId, name: "New folder", collapsed: false };
      }
      const next = workspaces.map((w) =>
        w.id === dragId
          ? { ...w, folderId, pinned: false }
          : w.id === targetId
            ? { ...w, folderId }
            : w,
      );
      setWorkspaces(next);
      if (newFolder) setFolders((fs) => [...fs, newFolder!]);
    },
    [workspaces],
  );

  // Move a tab into a folder, or out of any folder (folderId = null).
  const moveToFolder = useCallback((id: string, folderId: string | null) => {
    setWorkspaces((ws) =>
      ws.map((w) => (w.id === id ? { ...w, folderId: folderId ?? undefined } : w)),
    );
  }, []);

  const addFolder = useCallback(() => {
    setFolders((fs) => [...fs, { id: uuid(), name: "New folder", collapsed: false }]);
  }, []);

  // Remove a folder and ungroup its members.
  const deleteFolder = useCallback((id: string) => {
    setWorkspaces((ws) =>
      ws.map((w) => (w.folderId === id ? { ...w, folderId: undefined } : w)),
    );
    setFolders((fs) => fs.filter((f) => f.id !== id));
  }, []);

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

  // The shared document editor (with tabs + console), reused by tools.
  const splitWs = workspaces.find((w) => w.id === splitId);
  const splitActive = !!splitId && splitId !== activeId && !!splitWs && isDesktop;

  const inputPanel = (
    <InputPanel
      value={history.value}
      onChange={history.replace}
      onReset={history.set}
      editorRef={inputEditor}
      selectedPath={selectedPath}
      onSelectPath={onSelectPath}
      onDeselect={() => setSelectedPath(null)}
      workspaces={workspaces}
      activeId={activeId}
      onSwitchWorkspace={switchWorkspace}
      onAddWorkspace={addWorkspace}
      onCloseWorkspace={closeWorkspace}
      onRenameWorkspace={renameWorkspace}
      onTogglePinWorkspace={togglePinWorkspace}
      verticalTabs={prefs.verticalTabs && isDesktop && !prefs.zenMode}
    />
  );

  const documentEditor = (
    <EditorDropZones onDropLeft={switchWorkspace} onDropRight={openSplit}>
      {splitActive ? (
        <Split
          direction="horizontal"
          initial={0.5}
          min={0.25}
          max={0.75}
          storageKey="doc-split"
          first={inputPanel}
          second={
            <SecondaryEditor
              value={historyB.value}
              onChange={historyB.replace}
              onReset={historyB.set}
              workspaces={workspaces}
              splitId={splitId!}
              onSwitch={openSplit}
              onAdd={addToSplit}
              onClose={closeWorkspace}
              onRename={renameWorkspace}
              onTogglePin={togglePinWorkspace}
              onCloseSplit={closeSplit}
              verticalTabs={prefs.verticalTabs && isDesktop && !prefs.zenMode}
            />
          }
        />
      ) : (
        inputPanel
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
            treeCollapsed ? (
              // Collapsed: expand via the toolbar's sidebar button.
              <div className="h-full">{workspace}</div>
            ) : (
              <Split
                direction="horizontal"
                initial={0.2}
                min={0.1}
                max={0.45}
                storageKey="sidebar"
                first={
                  prefs.verticalTabs ? (
                    <SidebarPanel
                      workspaces={workspaces}
                      folders={folders}
                      activeId={activeId}
                      onSwitchWorkspace={switchWorkspace}
                      onAddWorkspace={addWorkspace}
                      onCloseWorkspace={closeWorkspace}
                      onRenameWorkspace={renameWorkspace}
                      onTogglePinWorkspace={togglePinWorkspace}
                      onGroupTabs={groupTabs}
                      onMoveToFolder={moveToFolder}
                      onAddFolder={addFolder}
                      onDeleteFolder={deleteFolder}
                      onRenameFolder={renameFolder}
                      onToggleFolder={toggleFolder}
                      splitId={splitId}
                      onOpenSplit={openSplit}
                      onCloseSplit={closeSplit}
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
                      onCollapse={() => collapseTree(true)}
                    />
                  )
                }
                second={workspace}
              />
            )
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
        activeId={activeId}
        onJump={(id, from, to) => {
          if (id !== activeId) switchWorkspace(id);
          setGlobalSearchOpen(false);
          // Let the workspace swap settle, then select the match.
          setTimeout(
            () => inputEditor.current?.focusRange(from, to, { focus: false }),
            id !== activeId ? 80 : 0,
          );
        }}
      />

      <Tour open={onboardOpen} onClose={closeOnboarding} />
      </SidebarToggleProvider>
      </DocumentActionsProvider>
      </ConsoleProvider>
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
  // with the {J} icon at the very top. All controls are uniform borderless icons.
  if (zenMode) {
    const iconBtn =
      "flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-bg-softer hover:text-gray-200 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-400";
    return (
      <div className="flex h-full shrink-0 flex-col items-center gap-1 overflow-y-auto border-r border-border bg-bg-soft p-1.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent font-mono text-[11px] font-bold tracking-tight text-white">
          {"{J}"}
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
            ?
          </button>
          {preferences}
        </div>
      </div>
    );
  }

  return (
    <header className="flex shrink-0 flex-col gap-2 border-b border-border bg-bg-soft px-3 py-2 sm:flex-row sm:items-center">
      <div className="flex items-center gap-2">
        {showTreeToggle && (
          <button
            onClick={onToggleTree}
            className="rounded-md border border-border px-2 py-1 text-sm text-gray-300 hover:bg-bg-softer lg:hidden"
            aria-label="Toggle tree"
            title="Toggle structure tree"
          >
            ☰
          </button>
        )}
        <span className="flex h-6 items-center justify-center rounded-md bg-accent px-1.5 font-mono text-sm font-bold tracking-tight text-white">
          {"{J}"}
        </span>
        {!zenMode && (
          <>
            <span className="text-[15px] font-semibold tracking-tightish text-gray-100">
              Kuya Json
            </span>
            <span className="hidden text-xs font-normal text-gray-500 lg:inline">
              · built by ep
            </span>
          </>
        )}
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
                {!zenMode && t.label}
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
