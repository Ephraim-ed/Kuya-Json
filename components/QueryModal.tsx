"use client";

import { X } from "lucide-react";
import { Dialog } from "./ui/dialog";
import { useEffect, useMemo, useRef, useState } from "react";
import { Banner, Button } from "./ui";
import { useConsole, type OutputItem } from "./console";
import { validate } from "@/lib/json/validate";
import { queryJsonPath } from "@/lib/json/query";

type Mode = "find" | "jsonpath";

interface Props {
  input: string;
  setInput: (v: string) => void;
  open: boolean;
  onClose: () => void;
  /** Select/scroll to a char range in the editor (without stealing focus). */
  focusRange: (from: number, to: number) => void;
  /** Focus a JSONPath in the editor (used by the JSONPath mode). */
  onSelectPath?: (path: string) => void;
}

interface Match {
  from: number;
  to: number;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildRegex(
  query: string,
  caseSensitive: boolean,
  wholeWord: boolean,
  regex: boolean,
): RegExp | null {
  if (query === "") return null;
  try {
    let pattern = regex ? query : escapeRegExp(query);
    if (wholeWord) pattern = `\\b(?:${pattern})\\b`;
    return new RegExp(pattern, caseSensitive ? "g" : "gi");
  } catch {
    return null;
  }
}

function findMatches(text: string, re: RegExp | null): Match[] {
  if (!re) return [];
  const out: Match[] = [];
  let m: RegExpExecArray | null;
  re.lastIndex = 0;
  while ((m = re.exec(text)) !== null) {
    out.push({ from: m.index, to: m.index + m[0].length });
    if (m.index === re.lastIndex) re.lastIndex++; // guard zero-length
    if (out.length > 5000) break;
  }
  return out;
}

function lineOf(text: string, pos: number): number {
  let line = 1;
  for (let i = 0; i < pos && i < text.length; i++) if (text[i] === "\n") line++;
  return line;
}
function previewOf(text: string, m: Match): string {
  const start = text.lastIndexOf("\n", m.from) + 1;
  let end = text.indexOf("\n", m.to);
  if (end === -1) end = text.length;
  const raw = text.slice(start, end).trim();
  return raw.length > 100 ? raw.slice(0, 97) + "…" : raw;
}

export default function QueryModal({
  input,
  setInput,
  open,
  onClose,
  focusRange,
  onSelectPath,
}: Props) {
  const [mode, setMode] = useState<Mode>("find");
  const [query, setQuery] = useState("");
  const [replace, setReplace] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [index, setIndex] = useState(0);
  const [expr, setExpr] = useState("");
  const findRef = useRef<HTMLInputElement>(null);
  const { setOutput } = useConsole();

  const re = useMemo(
    () => buildRegex(query, caseSensitive, wholeWord, useRegex),
    [query, caseSensitive, wholeWord, useRegex],
  );
  const invalidRegex = useRegex && query !== "" && re === null;
  const matches = useMemo(
    () => (mode === "find" ? findMatches(input, re) : []),
    [mode, input, re],
  );

  // JSONPath results
  const parsed = useMemo(() => validate(input), [input]);
  const jpResult = useMemo(() => {
    if (mode !== "jsonpath" || !parsed.ok) return null;
    return queryJsonPath(parsed.value, expr);
  }, [mode, parsed, expr]);

  useEffect(() => {
    if (open) setTimeout(() => findRef.current?.focus(), 30);
  }, [open, mode]);

  // Keep index in range and highlight the current match.
  useEffect(() => {
    if (mode !== "find" || matches.length === 0) return;
    const i = Math.min(index, matches.length - 1);
    const m = matches[i];
    if (m) focusRange(m.from, m.to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, matches]);

  function step(dir: 1 | -1) {
    if (matches.length === 0) return;
    setIndex((i) => (i + dir + matches.length) % matches.length);
  }

  function replaceCurrent() {
    if (matches.length === 0) return;
    const i = Math.min(index, matches.length - 1);
    const m = matches[i];
    setInput(input.slice(0, m.from) + replace + input.slice(m.to));
    // Index stays; matches recompute on next render.
  }

  function replaceAll() {
    if (!re || matches.length === 0) return;
    re.lastIndex = 0;
    setInput(input.replace(re, () => replace));
  }

  function sendAllToOutput() {
    if (matches.length === 0) {
      setOutput({
        kind: "matches",
        title: `No matches for "${query}"`,
        items: [],
      });
      onClose();
      return;
    }
    const items: OutputItem[] = matches.map((m) => ({
      from: m.from,
      to: m.to,
      line: lineOf(input, m.from),
      preview: previewOf(input, m),
    }));
    setOutput({
      kind: "matches",
      title: `${items.length} matches for "${query}"`,
      items,
    });
    onClose();
  }

  const toggle = (
    on: boolean,
    label: string,
    title: string,
    fn: () => void,
  ) => (
    <button
      onClick={fn}
      title={title}
      className={`flex h-6 w-7 items-center justify-center rounded text-xs font-medium ${
        on ? "bg-accent text-white" : "text-gray-400 hover:bg-bg-softer"
      }`}
    >
      {label}
    </button>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      label="Query JSON"
      className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-border bg-bg-soft shadow-2xl"
    >
      <div className="flex items-center gap-2 border-b border-border p-2">
        <Button active={mode === "find"} onClick={() => setMode("find")}>
          Find &amp; Replace
        </Button>
        <Button
          active={mode === "jsonpath"}
          onClick={() => setMode("jsonpath")}
        >
          JSONPath
        </Button>
        <button
          onClick={onClose}
          className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-bg-softer hover:text-gray-200"
          aria-label="Close"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      {mode === "find" ? (
        <div className="space-y-2 p-3">
          {/* Find row */}
          <div className="flex items-center gap-2">
            <input
              ref={findRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIndex(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") step(e.shiftKey ? -1 : 1);
              }}
              placeholder="Find"
              className={`min-w-0 flex-1 rounded border bg-bg px-2 py-1.5 font-mono text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-accent ${
                invalidRegex ? "border-danger-border" : "border-border"
              }`}
            />
            {toggle(caseSensitive, "Aa", "Match case", () =>
              setCaseSensitive((v) => !v),
            )}
            {toggle(wholeWord, "\\b", "Whole word", () =>
              setWholeWord((v) => !v),
            )}
            {toggle(useRegex, ".*", "Regular expression", () =>
              setUseRegex((v) => !v),
            )}
            <span className="w-16 shrink-0 text-right text-xs text-gray-500">
              {matches.length > 0
                ? `${Math.min(index + 1, matches.length)}/${matches.length}`
                : "0/0"}
            </span>
            <button
              onClick={() => step(-1)}
              disabled={matches.length === 0}
              className="rounded px-1.5 py-1 text-gray-400 hover:bg-bg-softer disabled:opacity-40"
              title="Previous (Shift+Enter)"
            >
              ↑
            </button>
            <button
              onClick={() => step(1)}
              disabled={matches.length === 0}
              className="rounded px-1.5 py-1 text-gray-400 hover:bg-bg-softer disabled:opacity-40"
              title="Next (Enter)"
            >
              ↓
            </button>
          </div>

          {/* Replace row */}
          <div className="flex items-center gap-2">
            <input
              value={replace}
              onChange={(e) => setReplace(e.target.value)}
              placeholder="Replace"
              className="min-w-0 flex-1 rounded border border-border bg-bg px-2 py-1.5 font-mono text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <Button onClick={replaceCurrent} disabled={matches.length === 0}>
              Replace
            </Button>
            <Button onClick={replaceAll} disabled={matches.length === 0}>
              All
            </Button>
            <Button
              variant="primary"
              onClick={sendAllToOutput}
              disabled={query === ""}
              title="List all matches in the Output panel"
            >
              Find all
            </Button>
          </div>

          {invalidRegex && (
            <Banner kind="error">Invalid regular expression.</Banner>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-2 border-b border-border p-3">
            <input
              ref={findRef}
              value={expr}
              onChange={(e) => setExpr(e.target.value)}
              placeholder="$..email"
              className="w-full rounded border border-border bg-bg px-3 py-2 font-mono text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-accent"
            />
            {!parsed.ok && input.trim() !== "" && (
              <Banner kind="error">{parsed.error.message}</Banner>
            )}
            {jpResult && !jpResult.ok && (
              <Banner kind="error">{jpResult.error}</Banner>
            )}
            {jpResult && jpResult.ok && expr.trim() !== "" && (
              <p className="text-xs text-gray-500">
                {jpResult.matches.length} match(es)
              </p>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-2">
            {jpResult && jpResult.ok && jpResult.matches.length > 0 ? (
              <ul className="space-y-1">
                {jpResult.matches.map((m, i) => (
                  <li key={i}>
                    <button
                      onClick={() => {
                        onSelectPath?.(m.path);
                        onClose();
                      }}
                      className="block w-full rounded px-2 py-1 text-left hover:bg-bg-softer"
                    >
                      <span className="font-mono text-xs text-accent-fg">
                        {m.path}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="p-3 text-sm text-gray-600">
                Enter a JSONPath expression. Click a result to jump to it.
              </p>
            )}
          </div>
        </>
      )}
    </Dialog>
  );
}
