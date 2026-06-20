"use client";

import { createContext, useContext, type ReactNode } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Tooltip from "./Tooltip";

interface SidebarToggleValue {
  collapsed: boolean;
  toggle: () => void;
  /** Whether a collapsible sidebar exists in the current layout. */
  available: boolean;
}

const Ctx = createContext<SidebarToggleValue | null>(null);

export function SidebarToggleProvider({
  value,
  children,
}: {
  value: SidebarToggleValue;
  children: ReactNode;
}) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Collapse/expand the left sidebar. Rendered in a tool's control row. */
export function SidebarToggleButton({ className = "" }: { className?: string }) {
  const ctx = useContext(Ctx);
  if (!ctx || !ctx.available) return null;
  return (
    <Tooltip text={ctx.collapsed ? "Show sidebar" : "Hide sidebar"} width={140}>
      <button
        onClick={ctx.toggle}
        aria-label={ctx.collapsed ? "Show sidebar" : "Hide sidebar"}
        className={`flex h-8 items-center justify-center rounded-md border border-border px-2 text-gray-300 hover:bg-bg-softer ${className}`}
      >
        {ctx.collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
      </button>
    </Tooltip>
  );
}
