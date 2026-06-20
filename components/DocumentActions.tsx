"use client";

import { createContext, useContext, type ReactNode } from "react";

interface DocActionsValue {
  value: string;
  onReset: (v: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const Ctx = createContext<DocActionsValue | null>(null);

export function DocumentActionsProvider({
  value,
  children,
}: {
  value: DocActionsValue;
  children: ReactNode;
}) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Access the shared document (content + reset/undo/redo). */
export function useDocumentActions() {
  return useContext(Ctx);
}
