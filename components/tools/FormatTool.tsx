"use client";

import { useEffect, useRef, useState } from "react";
import ToolFrame from "./ToolFrame";
import Tooltip from "../Tooltip";
import { Button, Select, Switch, useToast } from "../ui";
import { useConsole } from "../console";
import { SidebarToggleButton } from "../SidebarToggle";
import { type ToolProps } from "./types";
import { runMinify, runSort } from "@/lib/workers/client";
import { format, type IndentStyle } from "@/lib/json/format";
import { hasComments } from "@/lib/json/comments";
import { validate } from "@/lib/json/validate";
import { repair } from "@/lib/json/repair";
import { unescapeJson } from "@/lib/json/unescape";

const SETTINGS_KEY = "kuya-json:format-settings";

interface FormatSettings {
  indent: IndentStyle;
  autoValidate: boolean;
  autoFormat: boolean;
  autoRepair: boolean;
  autoUnescape: boolean;
}

export default function FormatTool({ input, setInput, editor }: ToolProps) {
  const [indent, setIndent] = useState<IndentStyle>("2");
  const [autoValidate, setAutoValidate] = useState(true);
  const [autoFormat, setAutoFormat] = useState(true);
  const [autoRepair, setAutoRepair] = useState(false);
  const [autoUnescape, setAutoUnescape] = useState(false);
  const settingsLoaded = useRef(false);
  const toast = useToast();
  const { push } = useConsole();

  // Restore the toggle settings (shared across all workspaces) once on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const s = JSON.parse(raw) as Partial<FormatSettings>;
        if (s.indent) setIndent(s.indent);
        if (typeof s.autoValidate === "boolean") setAutoValidate(s.autoValidate);
        if (typeof s.autoFormat === "boolean") setAutoFormat(s.autoFormat);
        if (typeof s.autoRepair === "boolean") setAutoRepair(s.autoRepair);
        if (typeof s.autoUnescape === "boolean") setAutoUnescape(s.autoUnescape);
      }
    } catch {
      /* ignore malformed / unavailable storage */
    }
    settingsLoaded.current = true;
  }, []);

  // Persist the settings whenever they change (after the initial load).
  useEffect(() => {
    if (!settingsLoaded.current) return;
    const s: FormatSettings = {
      indent,
      autoValidate,
      autoFormat,
      autoRepair,
      autoUnescape,
    };
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
    } catch {
      /* ignore */
    }
  }, [indent, autoValidate, autoFormat, autoRepair, autoUnescape]);

  async function apply(run: () => Promise<string>, label: string) {
    try {
      setInput(await run());
      push("ok", `${label} applied`, "format");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Invalid JSON.";
      toast(msg, { kind: "error" });
      push("error", msg, label.toLowerCase());
    }
  }

  // Auto-apply Format / Unescape / Repair (debounced) while their toggles are on.
  // Comments are off-limits to Unescape / Repair (they'd strip them); Format keeps
  // comments, so auto-format runs even when the document has `--` comments.
  useEffect(() => {
    if (!autoUnescape && !autoRepair && !autoFormat) return;
    const id = window.setTimeout(() => {
      let text = input;
      const applied: string[] = [];
      const commented = hasComments(input);

      if (autoUnescape && !commented) {
        const r = unescapeJson(text);
        if (r.changed) {
          text = r.text;
          applied.push("unescaped");
          push(
            "ok",
            r.expanded > 0
              ? `Unescaped (expanded ${r.expanded} nested value${r.expanded === 1 ? "" : "s"})`
              : "Unescaped JSON",
            "unescape",
          );
        }
      }
      if (autoRepair && !commented) {
        const v = validate(text);
        if (!v.ok) {
          const r = repair(text, 2);
          if (!r.error && r.changed) {
            text = r.text;
            applied.push("repaired");
            push("ok", `Repaired: ${r.fixes.join("; ")}`, "repair");
          } else if (r.error) {
            push("error", r.error, "repair");
          }
        }
      }
      // Normalize formatting when valid: always if Format is on, otherwise only
      // to tidy up after an unescape/repair.
      const v = validate(text);
      if (v.ok && (autoFormat || applied.length > 0)) {
        try {
          text = format(text, indent, { keepComments: true });
        } catch {
          /* leave as-is */
        }
      }

      if (text !== input) {
        setInput(text);
        if (applied.length > 0) {
          toast(`Auto-${applied.join(" & ")} ✓`, { kind: "ok" });
        }
      }
    }, 700);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, autoUnescape, autoRepair, autoFormat, indent]);

  const controls = (
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-2 py-1.5">
      <SidebarToggleButton />
      <Select
        title="Indentation"
        value={indent}
        onChange={(v) => setIndent(v as IndentStyle)}
        options={[
          { value: "2", label: "2 spaces" },
          { value: "4", label: "4 spaces" },
          { value: "tab", label: "Tabs" },
        ]}
      />
      <Tooltip text="Compress to a single line (remove all whitespace)." width={220}>
        <Button onClick={() => apply(() => runMinify(input), "Minify")}>Minify</Button>
      </Tooltip>
      <Tooltip text="Reorder object keys alphabetically (recursively)." width={220}>
        <Button onClick={() => apply(() => runSort(input, "asc", indent), "Sort keys")}>
          Sort keys
        </Button>
      </Tooltip>

      <span className="mx-1 h-5 w-px bg-border" />

      <Tooltip text="Continuously pretty-print the document with the chosen indentation." width={250}>
        <Switch label="Format" checked={autoFormat} onChange={setAutoFormat} />
      </Tooltip>
      <Tooltip text="Continuously check the document and show its validity." width={250}>
        <Switch label="Validate" checked={autoValidate} onChange={setAutoValidate} />
      </Tooltip>
      <Tooltip text="Automatically fix missing colons & commas, quotes, trailing commas, comments and Python literals when invalid." width={280}>
        <Switch label="Repair" checked={autoRepair} onChange={setAutoRepair} />
      </Tooltip>
      <Tooltip text="Automatically unwrap stringified / escaped JSON, including nested values." width={260}>
        <Switch label="Unescape" checked={autoUnescape} onChange={setAutoUnescape} />
      </Tooltip>
    </div>
  );

  return <ToolFrame controls={controls} editor={editor} />;
}
