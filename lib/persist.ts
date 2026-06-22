import { get, set } from "idb-keyval";

export interface Workspace {
  id: string;
  name: string;
  content: string;
  pinned?: boolean;
  /** When set, this workspace belongs to the folder (tab group) with this id. */
  folderId?: string;
}

/** A collapsible group of workspace tabs (Chrome-style tab group). */
export interface Folder {
  id: string;
  name: string;
  collapsed?: boolean;
}

/** An editor group (pane): its own ordered open editors and active one. */
export interface Group {
  openIds: string[];
  activeId: string;
}

export interface PersistState {
  workspaces: Workspace[];
  /** Kept for migrating older saves into `groups`. */
  activeId: string;
  activeTool: string;
  folders?: Folder[];
  /** Editor groups (1 or 2). Absent in older saves — migrated on load. */
  groups?: Group[];
  /** Focused group index (0 = left, 1 = right). */
  focused?: number;
}

const KEY = "kuya-json:state";

/** Generate a unique workspace id. */
export function uuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `w_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export async function loadState(): Promise<PersistState | undefined> {
  try {
    return await get<PersistState>(KEY);
  } catch {
    return undefined;
  }
}

export async function saveState(state: PersistState): Promise<void> {
  try {
    await set(KEY, state);
  } catch {
    /* IndexedDB unavailable (e.g. private mode) — ignore */
  }
}
