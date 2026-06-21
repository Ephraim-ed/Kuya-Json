"use client";

import { createContext, useContext, type ReactNode } from "react";
import { PanelLeftClose, PanelLeftOpen, Columns2, Rows2 } from "lucide-react";
import Tooltip from "./Tooltip";

interface SidebarToggleValue {
  collapsed: boolean;
  toggle: () => void;
  /** Whether a collapsible sidebar exists in the current layout. */
  available: boolean;
  /** Sidebar split (tabs over tree) layout — only with vertical tabs. */
  split: boolean;
  toggleSplit: () => void;
  splitAvailable: boolean;
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

/** Collapse/expand the left sidebar and toggle its split layout. Rendered in a
 *  tool's control row. */
export function SidebarToggleButton({ className = "" }: { className?: string }) {
  const ctx = useContext(Ctx);
  if (!ctx || !ctx.available) return null;
  return (
    <span className={`flex items-center gap-1.5 ${className}`}>
      <Tooltip text={ctx.collapsed ? "Show sidebar" : "Hide sidebar"} width={140}>
        <button
          onClick={ctx.toggle}
          aria-label={ctx.collapsed ? "Show sidebar" : "Hide sidebar"}
          className="flex h-8 items-center justify-center rounded-md border border-border px-2 text-gray-300 hover:bg-bg-softer"
        >
          {ctx.collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
        </button>
      </Tooltip>
      {ctx.splitAvailable && !ctx.collapsed && (
        <Tooltip
          text={ctx.split ? "Combine sidebar into tabs" : "Split sidebar: tabs over tree"}
          width={190}
        >
          <button
            onClick={ctx.toggleSplit}
            aria-label="Toggle sidebar split layout"
            className={`flex h-8 items-center justify-center rounded-md border border-border px-2 text-gray-300 hover:bg-bg-softer ${
              ctx.split ? "bg-bg-softer" : ""
            }`}
          >
            {ctx.split ? <Columns2 size={15} /> : <Rows2 size={15} />}
          </button>
        </Tooltip>
      )}
    </span>
  );
}
