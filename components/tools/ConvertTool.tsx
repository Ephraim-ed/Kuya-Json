"use client";

import { useState } from "react";
import ToolFrame from "./ToolFrame";
import { Button, Select } from "../ui";
import { useConsole } from "../console";
import { type ToolProps } from "./types";
import { convert, toCsv, type ConvertTarget } from "@/lib/json/convert";
import { stripComments } from "@/lib/json/comments";

/** Parse CSV text into rows of cells (handles quoted fields). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") {
      field += c;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const TARGETS: {
  value: ConvertTarget;
  label: string;
  ext: string;
  mime: string;
}[] = [
  { value: "csv", label: "CSV", ext: "csv", mime: "text/csv" },
  { value: "yaml", label: "YAML", ext: "yaml", mime: "text/yaml" },
  { value: "xml", label: "XML", ext: "xml", mime: "application/xml" },
  { value: "typescript", label: "TypeScript types", ext: "ts", mime: "text/plain" },
  { value: "python", label: "Python (dataclass)", ext: "py", mime: "text/plain" },
  { value: "pydantic", label: "Python (Pydantic)", ext: "py", mime: "text/plain" },
  { value: "go", label: "Go structs", ext: "go", mime: "text/plain" },
  { value: "schema", label: "JSON Schema", ext: "schema.json", mime: "application/json" },
];

export default function ConvertTool({ input, editor }: ToolProps) {
  const [target, setTarget] = useState<ConvertTarget>("csv");
  const [busy, setBusy] = useState(false);
  const [unwind, setUnwind] = useState(true);
  const { setOutput, push, clearSource } = useConsole();

  const meta = TARGETS.find((t) => t.value === target)!;

  async function run() {
    setBusy(true);
    clearSource("convert");
    try {
      if (target === "csv") {
        const text = await toCsv(JSON.parse(stripComments(input)), unwind);
        const all = parseCsv(text);
        setOutput({
          kind: "table",
          title: "Converted to CSV",
          headers: all[0] ?? [],
          rows: all.slice(1),
          text,
          filename: `output.${meta.ext}`,
          mime: meta.mime,
        });
      } else {
        const text = await convert(input, target);
        setOutput({
          kind: "text",
          title: `Converted to ${meta.label}`,
          text,
          filename: `output.${meta.ext}`,
          mime: meta.mime,
        });
      }
      push("ok", `Converted to ${meta.label}`, "convert");
    } catch (e) {
      push("error", e instanceof Error ? e.message : "Conversion failed.", "convert");
    } finally {
      setBusy(false);
    }
  }

  const controls = (
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-2 py-1.5">
      <Select
        title="Target format"
        value={target}
        onChange={(v) => setTarget(v as ConvertTarget)}
        options={TARGETS.map((t) => ({ value: t.value, label: t.label }))}
      />
      <Button variant="primary" onClick={run} disabled={busy}>
        {busy ? "Converting…" : "Convert"}
      </Button>
      {target === "csv" && (
        <label
          className="flex items-center gap-1.5 text-xs text-gray-400"
          title="Emit a separate row for each element of an array field"
        >
          <input
            type="checkbox"
            checked={unwind}
            onChange={(e) => setUnwind(e.target.checked)}
          />
          Split arrays into rows
        </label>
      )}
    </div>
  );

  return <ToolFrame controls={controls} editor={editor} />;
}
