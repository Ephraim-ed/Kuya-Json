"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { copyText } from "@/lib/clipboard";
import { downloadText } from "@/lib/download";
import TableView from "./TableView";

export type ConsoleLevel = "error" | "warn" | "ok" | "info";

export interface ConsoleMessage {
  id: number;
  level: ConsoleLevel;
  text: string;
  at: number;
  source?: string;
  /** Editor char range to jump to when the message is clicked. */
  range?: { from: number; to: number };
}

export interface OutputItem {
  from: number;
  to: number;
  line: number;
  preview: string;
}
export type DockOutput =
  | { kind: "matches"; title: string; items: OutputItem[] }
  | {
      kind: "text";
      title: string;
      text: string;
      filename?: string;
      mime?: string;
    }
  | {
      kind: "table";
      title: string;
      headers: string[];
      rows: string[][];
      /** Raw text for copy/download. */
      text: string;
      filename?: string;
      mime?: string;
    };

type DockTab = "console" | "output";

interface DockCtx {
  messages: ConsoleMessage[];
  push: (
    level: ConsoleLevel,
    text: string,
    source?: string,
    range?: { from: number; to: number },
  ) => void;
  clearSource: (source: string) => void;
  clear: () => void;
  output: DockOutput | null;
  /** Set the Output contents and switch the dock to the Output tab. */
  setOutput: (o: DockOutput | null) => void;
  activeTab: DockTab;
  setActiveTab: (t: DockTab) => void;
  /** Open/minimized state of the dock (persists across module switches). */
  open: boolean;
  setOpen: (o: boolean | ((prev: boolean) => boolean)) => void;
}

const Ctx = createContext<DockCtx>({
  messages: [],
  push: () => {},
  clearSource: () => {},
  clear: () => {},
  output: null,
  setOutput: () => {},
  activeTab: "console",
  setActiveTab: () => {},
  open: false,
  setOpen: () => {},
});

export function ConsoleProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ConsoleMessage[]>([]);
  const [output, setOutputState] = useState<DockOutput | null>(null);
  const [activeTab, setActiveTab] = useState<DockTab>("console");
  const [open, setOpen] = useState(false);
  const idRef = useRef(0);

  // Auto open/minimize: open when content first arrives, minimize when all
  // empty. Lives here (not in DockPanel) so the state survives tool switches.
  const prevState = useRef({ msgs: 0, hasOutput: false });
  useEffect(() => {
    const hasOutput = !!output;
    const empty = messages.length === 0 && !hasOutput;
    if (empty) {
      setOpen(false);
    } else if (
      (prevState.current.msgs === 0 && messages.length > 0) ||
      (!prevState.current.hasOutput && hasOutput)
    ) {
      setOpen(true);
    }
    prevState.current = { msgs: messages.length, hasOutput };
  }, [messages.length, output]);

  const push = useCallback(
    (
      level: ConsoleLevel,
      text: string,
      source?: string,
      range?: { from: number; to: number },
    ) => {
      setMessages((m) => {
        const last = m[m.length - 1];
        if (last && last.level === level && last.text === text && last.source === source) {
          return m;
        }
        return [
          ...m,
          { id: idRef.current++, level, text, at: Date.now(), source, range },
        ].slice(-200);
      });
    },
    [],
  );

  const clearSource = useCallback((source: string) => {
    setMessages((m) => m.filter((x) => x.source !== source));
  }, []);

  const clear = useCallback(() => setMessages([]), []);

  const setOutput = useCallback((o: DockOutput | null) => {
    setOutputState(o);
    if (o) setActiveTab("output");
  }, []);

  return (
    <Ctx.Provider
      value={{
        messages,
        push,
        clearSource,
        clear,
        output,
        setOutput,
        activeTab,
        setActiveTab,
        open,
        setOpen,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useConsole() {
  return useContext(Ctx);
}

const LEVEL_STYLE: Record<ConsoleLevel, string> = {
  error: "text-red-400",
  warn: "text-amber-300",
  ok: "text-green-400",
  info: "text-gray-400",
};
const LEVEL_ICON: Record<ConsoleLevel, string> = {
  error: "✕",
  warn: "!",
  ok: "✓",
  info: "•",
};

function fmtTime(at: number): string {
  return new Date(at).toLocaleTimeString(undefined, { hour12: false });
}

const MIN_H = 60;
const MAX_H = 480;
const HEIGHT_KEY = "console:height";

/** Bottom dock with Console (messages) and Output (search results) tabs. */
export function DockPanel({
  onFocusRange,
}: {
  onFocusRange?: (from: number, to: number) => void;
}) {
  const { messages, clear, output, setOutput, activeTab, setActiveTab, open, setOpen } =
    useConsole();
  const [height, setHeight] = useState(120);
  const [dragging, setDragging] = useState(false);
  const start = useRef({ y: 0, h: 0 });
  const heightRef = useRef(height);
  heightRef.current = height;
  const endRef = useRef<HTMLDivElement>(null);

  const errors = messages.filter((m) => m.level === "error").length;

  useEffect(() => {
    const s = localStorage.getItem(HEIGHT_KEY);
    if (s) {
      const v = Number(s);
      if (!Number.isNaN(v)) setHeight(Math.min(MAX_H, Math.max(MIN_H, v)));
    }
  }, []);

  useEffect(() => {
    if (open && activeTab === "console") endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, open, activeTab]);

  useEffect(() => {
    if (!dragging) return;
    const move = (e: MouseEvent) => {
      e.preventDefault();
      const next = Math.min(
        MAX_H,
        Math.max(MIN_H, start.current.h + (start.current.y - e.clientY)),
      );
      setHeight(next);
    };
    const up = () => {
      setDragging(false);
      localStorage.setItem(HEIGHT_KEY, String(heightRef.current));
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [dragging]);

  const tabBtn = (tab: DockTab, label: string, badge?: ReactNode) => (
    <button
      onClick={() => {
        // Clicking the active tab again minimizes the dock.
        if (activeTab === tab && open) {
          setOpen(false);
        } else {
          setActiveTab(tab);
          setOpen(true);
        }
      }}
      className={`flex items-center gap-1.5 border-b-2 px-2 py-1 text-xs font-medium ${
        activeTab === tab
          ? "border-accent text-gray-100"
          : "border-transparent text-gray-500 hover:text-gray-300"
      }`}
    >
      {label}
      {badge}
    </button>
  );

  return (
    <div
      className={`flex shrink-0 flex-col border-t border-border bg-bg ${
        dragging ? "select-none" : ""
      }`}
    >
      {open && (
        <div
          onMouseDown={(e) => {
            start.current = { y: e.clientY, h: height };
            setDragging(true);
          }}
          title="Drag to resize"
          className={`h-1.5 shrink-0 cursor-row-resize ${
            dragging ? "bg-accent" : "hover:bg-accent"
          }`}
        />
      )}

      <div className="flex items-center gap-1 px-1">
        <button
          onClick={() => setOpen((o) => !o)}
          title={open ? "Collapse" : "Expand"}
          className="flex h-6 w-6 items-center justify-center text-gray-400 hover:text-gray-200"
        >
          <span
            className={`inline-block text-lg leading-none transition-transform ${
              open ? "rotate-90" : ""
            }`}
          >
            ›
          </span>
        </button>

        {tabBtn(
          "console",
          "Console",
          errors > 0 ? (
            <span className="rounded bg-red-950 px-1.5 text-[10px] text-red-300">
              {errors}
            </span>
          ) : (
            <span className="text-[10px] text-gray-600">{messages.length}</span>
          ),
        )}
        {tabBtn(
          "output",
          "Output",
          output ? (
            <span className="text-[10px] text-gray-600">
              {output.kind === "matches"
                ? output.items.length
                : output.kind === "table"
                  ? output.rows.length
                  : ""}
            </span>
          ) : undefined,
        )}

        {/* Copy/download for text & table output */}
        {activeTab === "output" &&
          (output?.kind === "text" || output?.kind === "table") && (
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={() => copyText(output.text)}
              className="px-1.5 text-xs text-gray-500 hover:text-gray-200"
              title="Copy output"
            >
              Copy
            </button>
            {output.filename && (
              <button
                onClick={() =>
                  downloadText(output.filename!, output.text, output.mime)
                }
                className="px-1.5 text-xs text-gray-500 hover:text-gray-200"
                title="Download output"
              >
                Download
              </button>
            )}
          </div>
        )}

        <button
          onClick={() => (activeTab === "console" ? clear() : setOutput(null))}
          className={`${
            activeTab === "output" &&
            (output?.kind === "text" || output?.kind === "table")
              ? ""
              : "ml-auto"
          } px-2 text-xs text-gray-500 hover:text-gray-200`}
          title={activeTab === "console" ? "Clear console" : "Clear output"}
        >
          Clear
        </button>
      </div>

      {open && (
        <div style={{ height }} className="overflow-auto px-2 pb-1 font-mono text-xs">
          {activeTab === "console" ? (
            messages.length === 0 ? (
              <p className="py-1 text-gray-600">
                Checks (validate, repair, schema) will report here.
              </p>
            ) : (
              <>
                {messages.map((m) => {
                  const clickable = !!m.range && !!onFocusRange;
                  return (
                    <div
                      key={m.id}
                      onClick={
                        clickable
                          ? () => onFocusRange!(m.range!.from, m.range!.to)
                          : undefined
                      }
                      className={`flex items-start gap-2 rounded py-0.5 ${
                        clickable ? "cursor-pointer hover:bg-bg-soft" : ""
                      }`}
                      title={clickable ? "Go to error" : undefined}
                    >
                      <span className="text-[10px] text-gray-600">{fmtTime(m.at)}</span>
                      <span className={LEVEL_STYLE[m.level]}>{LEVEL_ICON[m.level]}</span>
                      {m.source && <span className="text-gray-500">[{m.source}]</span>}
                      <span
                        className={`flex-1 ${LEVEL_STYLE[m.level]} ${
                          clickable ? "underline decoration-dotted underline-offset-2" : ""
                        }`}
                      >
                        {m.text}
                      </span>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </>
            )
          ) : !output ? (
            <p className="py-1 text-gray-600">
              Convert output and search results will appear here.
            </p>
          ) : output.kind === "table" ? (
            <>
              <p className="py-1 text-gray-500">{output.title}</p>
              <TableView headers={output.headers} rows={output.rows} />
            </>
          ) : output.kind === "matches" ? (
            <>
              <p className="py-1 text-gray-500">{output.title}</p>
              {output.items.map((it, i) => (
                <button
                  key={i}
                  onClick={() => onFocusRange?.(it.from, it.to)}
                  className="flex w-full items-start gap-2 rounded px-1 py-0.5 text-left hover:bg-bg-soft"
                >
                  <span className="shrink-0 text-gray-600">{it.line}:</span>
                  <span className="flex-1 truncate text-gray-300">{it.preview}</span>
                </button>
              ))}
            </>
          ) : (
            <div>
              <p className="py-1 text-gray-500">{output.title}</p>
              <pre className="whitespace-pre text-gray-300">{output.text}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
