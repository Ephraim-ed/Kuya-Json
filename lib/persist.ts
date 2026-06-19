import { get, set } from "idb-keyval";

export interface Workspace {
  id: string;
  name: string;
  content: string;
  pinned?: boolean;
}

export interface PersistState {
  workspaces: Workspace[];
  activeId: string;
  activeTool: string;
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
