"use client";

import { useState } from "react";
import ToolFrame from "./ToolFrame";
import JsonEditor from "../JsonEditor";
import { Button } from "../ui";
import { useConsole } from "../console";
import { DocumentActions } from "../DocumentActions";
import { type ToolProps } from "./types";
import { generateSchema, validateAgainstSchema } from "@/lib/json/schema";

type Mode = "generate" | "validate";

export default function SchemaTool({ input, editor }: ToolProps) {
  const [mode, setMode] = useState<Mode>("generate");
  const [schemaText, setSchemaText] = useState("");
  const [busy, setBusy] = useState(false);
  const { push, clearSource, setOutput } = useConsole();

  async function generate() {
    setBusy(true);
    clearSource("schema");
    try {
      const text = await generateSchema(input);
      // Send the generated schema to the Output tab of the bottom dock.
      setOutput({
        kind: "text",
        title: "Generated JSON Schema (draft 2020-12)",
        text,
        filename: "schema.json",
        mime: "application/json",
      });
      push("ok", "Generated JSON Schema", "schema");
    } catch (e) {
      push("error", e instanceof Error ? e.message : "Could not generate schema.", "schema");
    } finally {
      setBusy(false);
    }
  }

  function runValidate() {
    clearSource("schema");
    const r = validateAgainstSchema(input, schemaText);
    if (r.fatal) {
      push("error", r.fatal, "schema");
    } else if (r.valid) {
      push("ok", "Document matches the schema ✓", "schema");
    } else {
      push(
        "error",
        `Schema validation failed (${r.errors.length} issue${r.errors.length === 1 ? "" : "s"})`,
        "schema",
      );
      r.errors.forEach((e) => push("error", e, "schema"));
    }
  }

  const controls = (
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-2 py-1.5">
      <Button active={mode === "generate"} onClick={() => setMode("generate")}>
        Generate schema
      </Button>
      <Button active={mode === "validate"} onClick={() => setMode("validate")}>
        Validate against schema
      </Button>
      {mode === "generate" ? (
        <Button variant="primary" onClick={generate} disabled={busy}>
          {busy ? "Generating…" : "Generate"}
        </Button>
      ) : (
        <Button variant="primary" onClick={runValidate}>
          Validate
        </Button>
      )}
      <DocumentActions className="ml-auto" />
    </div>
  );

  // In validate mode the user needs an editor to paste the schema; generate mode
  // has no side pane — its result goes to the dock's Output tab.
  const results =
    mode === "validate" ? (
      <div className="flex h-full min-h-0 flex-col border-l border-border">
        <div className="border-b border-border px-2 py-1 text-xs font-medium uppercase tracking-wide text-gray-500">
          Schema to validate against
        </div>
        <div className="min-h-0 flex-1">
          <JsonEditor
            value={schemaText}
            onChange={setSchemaText}
            placeholder='{ "type": "object", ... }'
          />
        </div>
      </div>
    ) : undefined;

  return (
    <ToolFrame
      controls={controls}
      editor={editor}
      results={results}
      splitKey="schema"
      direction="horizontal"
    />
  );
}
