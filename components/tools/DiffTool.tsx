"use client";

import { useRef, useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import MergeEditor, { type MergeEditorHandle } from "../MergeEditor";
import { Button } from "../ui";
import { type ToolProps } from "./types";

export default function DiffTool({ input }: ToolProps) {
  const [left, setLeft] = useState(input);
  const [right, setRight] = useState("");
  const mergeRef = useRef<MergeEditorHandle>(null);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-2 py-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Compare two documents
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <Button onClick={() => mergeRef.current?.prev()} title="Previous conflict">
            <ChevronUp size={15} />
            Previous
          </Button>
          <Button onClick={() => mergeRef.current?.next()} title="Next conflict">
            <ChevronDown size={15} />
            Next
          </Button>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <MergeEditor
          ref={mergeRef}
          left={left}
          right={right}
          showDiff={right.trim() !== ""}
          onLeftChange={setLeft}
          onRightChange={setRight}
        />
      </div>
    </div>
  );
}
