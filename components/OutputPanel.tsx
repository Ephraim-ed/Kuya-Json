"use client";

import { type ReactNode } from "react";
import JsonEditor from "./JsonEditor";
import { Button, useToast } from "./ui";
import { copyText } from "@/lib/clipboard";
import { downloadText } from "@/lib/download";

interface Props {
  value: string;
  language?: "json" | "text";
  /** Download filename, e.g. "output.json". When omitted, download is hidden. */
  filename?: string;
  mime?: string;
  /** Extra controls rendered in the header, left of copy/download. */
  actions?: ReactNode;
  emptyHint?: string;
}

/** Read-only result pane with copy + download. */
export default function OutputPanel({
  value,
  language = "json",
  filename,
  mime = "application/json",
  actions,
  emptyHint = "Output will appear here.",
}: Props) {
  const toast = useToast();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-2 py-1.5">
        <span className="px-1 text-xs font-medium uppercase tracking-caps text-gray-500">
          Output
        </span>
        <div className="ml-auto flex items-center gap-2">
          {actions}
          <Button
            onClick={async () => {
              if (!value) return;
              const ok = await copyText(value);
              toast(ok ? "Copied to clipboard" : "Copy failed");
            }}
            disabled={!value}
            title="Copy output"
          >
            Copy
          </Button>
          {filename && (
            <Button
              onClick={() => {
                if (value) downloadText(filename, value, mime);
              }}
              disabled={!value}
              title="Download output"
            >
              Download
            </Button>
          )}
        </div>
      </div>
      <div className="min-h-0 flex-1">
        {value ? (
          <JsonEditor value={value} readOnly language={language} />
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-gray-600">
            {emptyHint}
          </div>
        )}
      </div>
    </div>
  );
}
