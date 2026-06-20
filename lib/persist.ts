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

export interface PersistState {
  workspaces: Workspace[];
  activeId: string;
  activeTool: string;
  folders?: Folder[];
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
