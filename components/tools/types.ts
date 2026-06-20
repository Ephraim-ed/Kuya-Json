import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export interface ToolProps {
  /** Current document text. */
  input: string;
  /** Replace the document (tools transform it in place). */
  setInput: (value: string) => void;
  /** The shared single document editor to embed in the tool's layout. */
  editor: ReactNode;
}

export type ToolId =
  | "format"
  | "anonymize"
  | "convert"
  | "diff"
  | "schema"
  | "transform";

export interface ToolMeta {
  id: ToolId;
  label: string;
  /** Lucide icon shown in the header nav. */
  icon: LucideIcon;
  /** Short hover help describing what the tool does and how to use it. */
  info: string;
  /** Diff takes over the whole workspace (two inputs, no shared editor). */
  fullWidth?: boolean;
  /** Hide the shared document editor (tool renders its own). */
  ownInput?: boolean;
}
