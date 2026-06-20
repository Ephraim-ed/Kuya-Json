import type { ComponentType } from "react";
import {
  Braces,
  VenetianMask,
  ArrowLeftRight,
  GitCompare,
  FileCheck,
  Wand2,
} from "lucide-react";
import type { ToolMeta, ToolProps } from "./types";
import FormatTool from "./FormatTool";
import AnonymizeTool from "./AnonymizeTool";
import ConvertTool from "./ConvertTool";
import DiffTool from "./DiffTool";
import SchemaTool from "./SchemaTool";
import TransformTool from "./TransformTool";

export const TOOLS: (ToolMeta & { component: ComponentType<ToolProps> })[] = [
  {
    id: "format",
    label: "Format",
    icon: Braces,
    component: FormatTool,
    info: "Pretty-print, minify or sort the document. Validate checks it's well-formed; Repair fixes missing colons & commas, quotes, trailing commas, comments and Python literals; Unescape unwraps stringified JSON, including nested escaped values inside fields.",
  },
  {
    id: "anonymize",
    label: "Anonymize",
    icon: VenetianMask,
    component: AnonymizeTool,
    info: "Mask sensitive data. Detected PII (emails, phones, SSNs, cards, IPs, names) is listed on the right — click “Anonymize all”, or add your own rules by key name, glob, regex or JSONPath. Replaces values in place with realistic fakes, masks, redaction or stable hashes.",
  },
  {
    id: "convert",
    label: "Convert",
    icon: ArrowLeftRight,
    component: ConvertTool,
    info: "Convert the document to another format: YAML, XML, CSV, TypeScript types, Python dataclasses/Pydantic, Go structs, or a JSON Schema. The result appears in the lower pane to copy or download.",
  },
  {
    id: "diff",
    label: "Diff",
    icon: GitCompare,
    fullWidth: true,
    ownInput: true,
    component: DiffTool,
    info: "Compare two JSON documents structurally (not just text). Paste into the left and right panes; added/removed/changed values are highlighted below. Optionally ignore array order.",
  },
  {
    id: "schema",
    label: "Schema",
    icon: FileCheck,
    component: SchemaTool,
    info: "Generate a JSON Schema (draft 2020-12) from the document, or validate the document against a schema you paste in. Validation errors list the exact failing paths.",
  },
  {
    id: "transform",
    label: "Transform",
    icon: Wand2,
    component: TransformTool,
    info: "Restructure the document in place: sort keys, flatten to dot-notation or unflatten back, or merge a second document using deep / last-wins / first-wins strategies.",
  },
];
