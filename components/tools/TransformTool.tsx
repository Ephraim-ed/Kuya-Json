"use client";

import { useState } from "react";
import ToolFrame from "./ToolFrame";
import { Button, Select } from "../ui";
import { useConsole } from "../console";
import { type ToolProps } from "./types";
import { validate } from "@/lib/json/validate";
import {
  flatten,
  merge,
  sortKeys,
  unflatten,
  type MergeStrategy,
  type SortOrder,
} from "@/lib/json/transform";

type Op = "sort" | "flatten" | "unflatten" | "merge";

export default function TransformTool({ input, setInput, editor }: ToolProps) {
  const [op, setOp] = useState<Op>("sort");
  const [order, setOrder] = useState<SortOrder>("asc");
  const [strategy, setStrategy] = useState<MergeStrategy>("deep");
  const [mergeSecond, setMergeSecond] = useState("");
  const [showMerge, setShowMerge] = useState(false);
  const { push, clearSource } = useConsole();

  function run() {
    clearSource("transform");
    const v = validate(input);
    if (!v.ok) {
      push("error", v.error.message, "transform");
      return;
    }
    try {
      let result: unknown;
      if (op === "sort") result = sortKeys(v.value, order);
      else if (op === "flatten") result = flatten(v.value);
      else if (op === "unflatten") result = unflatten(v.value as Record<string, unknown>);
      else {
        const second = validate(mergeSecond);
        if (!second.ok) {
          push("error", `Second document: ${second.error.message}`, "transform");
          return;
        }
        result = merge([v.value, second.value], strategy);
      }
      setInput(JSON.stringify(result, null, 2)); // apply in place
      push("ok", `${op} applied`, "transform");
    } catch (e) {
      push("error", e instanceof Error ? e.message : "Transform failed.", "transform");
    }
  }

  const controls = (
    <div className="flex flex-col gap-2 border-b border-border px-2 py-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={op}
          onChange={(v) => {
            setOp(v as Op);
            setShowMerge(v === "merge");
          }}
          options={[
            { value: "sort", label: "Sort keys" },
            { value: "flatten", label: "Flatten" },
            { value: "unflatten", label: "Unflatten" },
            { value: "merge", label: "Merge" },
          ]}
        />
        {op === "sort" && (
          <Select
            value={order}
            onChange={(v) => setOrder(v as SortOrder)}
            options={[
              { value: "asc", label: "A → Z" },
              { value: "desc", label: "Z → A" },
            ]}
          />
        )}
        {op === "merge" && (
          <Select
            value={strategy}
            onChange={(v) => setStrategy(v as MergeStrategy)}
            options={[
              { value: "deep", label: "Deep merge" },
              { value: "lastWins", label: "Last wins" },
              { value: "firstWins", label: "First wins" },
            ]}
          />
        )}
        <Button variant="primary" onClick={run}>
          Run
        </Button>
      </div>
      {showMerge && (
        <textarea
          value={mergeSecond}
          onChange={(e) => setMergeSecond(e.target.value)}
          placeholder="Second JSON document to merge with the current document…"
          className="h-20 w-full resize-y rounded border border-border bg-bg px-2 py-1.5 font-mono text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-accent"
        />
      )}
    </div>
  );

  return <ToolFrame controls={controls} editor={editor} />;
}
