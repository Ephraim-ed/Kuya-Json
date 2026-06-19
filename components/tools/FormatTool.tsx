"use client";

import { useEffect, useState } from "react";
import ToolFrame from "./ToolFrame";
import Tooltip from "../Tooltip";
import { Button, Select, Switch, useToast } from "../ui";
import { useConsole } from "../console";
import { DocumentActions } from "../DocumentActions";
import { type ToolProps } from "./types";
import { runFormat, runMinify, runSort } from "@/lib/workers/client";
import { format, type IndentStyle } from "@/lib/json/format";
import { validate } from "@/lib/json/validate";
import { repair } from "@/lib/json/repair";
import { unescapeJson } from "@/lib/json/unescape";

export default function FormatTool({ input, setInput, editor }: ToolProps) {
  const [indent, setIndent] = useState<IndentStyle>("2");
  const [autoValidate, setAutoValidate] = useState(true);
  const [autoRepair, setAutoRepair] = useState(false);
  const [autoUnescape, setAutoUnescape] = useState(false);
  const [keepComments, setKeepComments] = useState(false);
  const toast = useToast();
  const { push } = useConsole();

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

  // Auto-apply Unescape / Repair (debounced) while their toggles are on.
  useEffect(() => {
    if (!autoUnescape && !autoRepair) return;
    const id = window.setTimeout(() => {
      let text = input;
      const applied: string[] = [];

      if (autoUnescape) {
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
      if (autoRepair) {
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
      // Normalize formatting when the result is valid.
      const v = validate(text);
      if (v.ok) {
        try {
          text = format(text, indent, { keepComments });
        } catch {
          /* leave as-is */
        }
      }

      if (applied.length > 0 && text !== input) {
        setInput(text);
        toast(`Auto-${applied.join(" & ")} ✓`, { kind: "ok" });
      }
    }, 700);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, autoUnescape, autoRepair, indent, keepComments]);

  const controls = (
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-2 py-1.5">
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
      <Tooltip text="Pretty-print the document with the chosen indentation." width={220}>
        <Button onClick={() => apply(() => runFormat(input, indent, keepComments), "Format")}>
          Format
        </Button>
      </Tooltip>
      <Tooltip text="Compress to a single line (remove all whitespace)." width={220}>
        <Button onClick={() => apply(() => runMinify(input), "Minify")}>Minify</Button>
      </Tooltip>
      <Tooltip text="Reorder object keys alphabetically (recursively)." width={220}>
        <Button onClick={() => apply(() => runSort(input, "asc", indent), "Sort keys")}>
          Sort keys
        </Button>
      </Tooltip>

      <span className="mx-1 h-5 w-px bg-border" />

      <Tooltip text="Continuously check the document and show its validity." width={250}>
        <Switch label="Validate" checked={autoValidate} onChange={setAutoValidate} />
      </Tooltip>
      <Tooltip text="Automatically fix missing colons & commas, quotes, trailing commas, comments and Python literals when invalid." width={280}>
        <Switch label="Repair" checked={autoRepair} onChange={setAutoRepair} />
      </Tooltip>
      <Tooltip text="Automatically unwrap stringified / escaped JSON, including nested values." width={260}>
        <Switch label="Unescape" checked={autoUnescape} onChange={setAutoUnescape} />
      </Tooltip>
      <Tooltip text="Keep -- line comments when formatting instead of stripping them." width={260}>
        <Switch label="Comments" checked={keepComments} onChange={setKeepComments} />
      </Tooltip>

      <DocumentActions className="ml-auto" />
    </div>
  );

  return <ToolFrame controls={controls} editor={editor} />;
}
