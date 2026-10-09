"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import {
  EditorView,
  keymap,
  lineNumbers,
  Decoration,
  ViewPlugin,
  type Command,
  type DecorationSet,
  type ViewUpdate,
} from "@codemirror/view";
import {
  EditorSelection,
  RangeSetBuilder,
  Prec,
  StateEffect,
  StateField,
  type ChangeSpec,
} from "@codemirror/state";
import { lintGutter, setDiagnostics, type Diagnostic } from "@codemirror/lint";
import { HighlightStyle, syntaxHighlighting, foldGutter } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import { githubDark, githubLight } from "@uiw/codemirror-theme-github";
import { useTheme } from "./theme";
import { useZen } from "./zen";
import { COMMENT_PREFIX } from "@/lib/json/comments";

export interface EditorMarker {
  /** 0-based character offset. */
  from: number;
  to: number;
  message: string;
  severity?: "error" | "warning" | "info";
}

/** Imperative handle: select and scroll to a source range. */
export interface JsonEditorHandle {
  focusRange: (from: number, to: number, opts?: { focus?: boolean }) => void;
  /**
   * Highlight Find results in the document; `active` is the index of the
   * current one (drawn stronger). An empty list clears them.
   */
  setFindMatches: (
    matches: { from: number; to: number }[],
    active: number,
  ) => void;
}

interface Props {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  markers?: EditorMarker[];
  /** Language hint; defaults to JSON. Pass "text" for plain output. */
  language?: "json" | "text";
  /** Editor font size in px (zoom). */
  fontSize?: number;
  /** Fired when the user (not code) moves the cursor; gives the head offset. */
  onUserSelect?: (offset: number) => void;
}

const wrap = EditorView.lineWrapping;

// Match the gutter background to the editor (no lighter gutter), keep a subtle
// divider, and lighten the line-number text.
const gutterTheme = EditorView.theme({
  ".cm-gutters": {
    backgroundColor: "transparent",
    borderRight: "1px solid rgba(128,128,128,0.25)",
  },
  ".cm-lineNumbers .cm-gutterElement": {
    color: "rgba(148,163,184,0.85)",
    cursor: "pointer",
    paddingRight: "2px",
  },
  // Fold chevrons sized to fill the line height (as tall as the numbers),
  // vertically centered, and snug against the row numbers.
  ".cm-foldGutter .cm-gutterElement": {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 2px",
    fontSize: "1.25em",
    lineHeight: "1",
    cursor: "pointer",
    color: "rgba(148,163,184,0.45)",
  },
  ".cm-foldGutter .cm-gutterElement:hover": {
    color: "rgba(148,163,184,0.85)",
  },
});

// A lucide-style chevron as an SVG node for the fold gutter markers.
function chevronMarker(open: boolean): HTMLElement {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2.5");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.style.width = "0.95em";
  svg.style.height = "0.95em";
  svg.style.display = "block";
  const poly = document.createElementNS(ns, "polyline");
  // ChevronDown when open (expanded), ChevronRight when folded.
  poly.setAttribute("points", open ? "6 9 12 15 18 9" : "9 18 15 12 9 6");
  svg.appendChild(poly);
  return svg as unknown as HTMLElement;
}

const foldChevrons = foldGutter({ markerDOM: chevronMarker });

// Clicking a line number selects (highlights) that whole row.
const clickableLineNumbers = lineNumbers({
  domEventHandlers: {
    mousedown(view, block) {
      const line = view.state.doc.lineAt(block.from);
      view.dispatch({ selection: EditorSelection.range(line.from, line.to) });
      view.focus();
      return true;
    },
  },
});

// Zen mode editor styling: a sans-serif font with keys in a lighter gray and
// values in a darker gray (two grays only).
const zenFontTheme = EditorView.theme({
  "&": {
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
  ".cm-content": {
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
});

const zenHighlightStyle = HighlightStyle.define([
  { tag: t.propertyName, color: "#7d8590" }, // keys — lighter gray (a touch darker)
  {
    tag: [t.string, t.number, t.bool, t.null, t.keyword],
    color: "#aab1bb", // values — lighter gray
  },
]);

// In zen mode, `--` comments are shown in green instead of the subtle gray.
const zenCommentTheme = EditorView.theme({
  ".cm-jsonc-comment": { color: "#22c55e !important" },
});

const zenEditorExtensions = [
  Prec.highest(zenFontTheme),
  Prec.highest(syntaxHighlighting(zenHighlightStyle)),
  Prec.highest(zenCommentTheme),
];

const COMMENT_RE = new RegExp(`^(\\s*)${COMMENT_PREFIX}\\s?`);

/** The set of lines spanned by the current selection ranges. */
function selectedLines(view: EditorView) {
  const { state } = view;
  const lines = new Map<number, ReturnType<typeof state.doc.lineAt>>();
  for (const range of state.selection.ranges) {
    let pos = range.from;
    while (pos <= range.to) {
      const line = state.doc.lineAt(pos);
      lines.set(line.number, line);
      pos = line.to + 1;
      if (range.from === range.to) break; // empty selection → just the caret line
    }
  }
  return [...lines.values()];
}

/** Prefix every selected non-blank line with `-- `. */
const commentLines: Command = (view) => {
  const changes: ChangeSpec[] = [];
  for (const line of selectedLines(view)) {
    if (line.text.trim() === "" || COMMENT_RE.test(line.text)) continue;
    const indent = line.text.length - line.text.trimStart().length;
    changes.push({ from: line.from + indent, insert: `${COMMENT_PREFIX} ` });
  }
  if (changes.length === 0) return false;
  view.dispatch({ changes, userEvent: "input.comment" });
  return true;
};

/** Strip a leading `--` comment marker from every selected line. */
const uncommentLines: Command = (view) => {
  const changes: ChangeSpec[] = [];
  for (const line of selectedLines(view)) {
    const m = line.text.match(COMMENT_RE);
    if (!m) continue;
    changes.push({ from: line.from + m[1].length, to: line.from + m[0].length });
  }
  if (changes.length === 0) return false;
  view.dispatch({ changes, userEvent: "delete.uncomment" });
  return true;
};

/** Toggle: uncomment if every selected non-blank line is commented, else comment. */
const toggleLineComment: Command = (view) => {
  const lines = selectedLines(view).filter((l) => l.text.trim() !== "");
  const allCommented =
    lines.length > 0 && lines.every((l) => COMMENT_RE.test(l.text));
  return allCommented ? uncommentLines(view) : commentLines(view);
};

// Subtle styling for `--` line comments (the JSON grammar doesn't know them).
const commentMark = Decoration.mark({ class: "cm-jsonc-comment" });

/** Index of the first `--` outside a string on a line, or -1. */
function commentStart(text: string): number {
  let inString = false;
  let escaped = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === "-" && text[i + 1] === "-") return i;
  }
  return -1;
}

function buildCommentDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  for (const { from, to } of view.visibleRanges) {
    let pos = from;
    while (pos <= to) {
      const line = view.state.doc.lineAt(pos);
      const idx = commentStart(line.text);
      if (idx >= 0) builder.add(line.from + idx, line.to, commentMark);
      pos = line.to + 1;
    }
  }
  return builder.finish();
}

const commentHighlighter = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = buildCommentDecorations(view);
    }
    update(u: ViewUpdate) {
      if (u.docChanged || u.viewportChanged) {
        this.decorations = buildCommentDecorations(u.view);
      }
    }
  },
  { decorations: (v) => v.decorations },
);

const commentTheme = EditorView.baseTheme({
  ".cm-jsonc-comment": { fontStyle: "italic" },
  "&light .cm-jsonc-comment": { color: "#9aa3ad !important" },
  "&dark .cm-jsonc-comment": { color: "#5c6370 !important" },
});

// Find results, set from outside (the Find modal) and mapped through edits.
const setFindMatchesEffect = StateEffect.define<DecorationSet>();
const findMatchMark = Decoration.mark({ class: "cm-find-match" });
const findActiveMark = Decoration.mark({
  class: "cm-find-match cm-find-match-active",
});

const findMatchesField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    deco = deco.map(tr.changes);
    for (const e of tr.effects) if (e.is(setFindMatchesEffect)) deco = e.value;
    return deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});

const findTheme = EditorView.baseTheme({
  ".cm-find-match": {
    backgroundColor: "rgb(var(--find) / 0.28)",
    borderRadius: "2px",
  },
  ".cm-find-match-active": {
    backgroundColor: "rgb(var(--find) / 0.6)",
    boxShadow: "0 0 0 1px rgb(var(--find))",
  },
});

// High precedence: Mod-Shift-k is CodeMirror's default "delete line".
const commentKeymap = Prec.high(
  keymap.of([
    { key: "Mod-/", run: toggleLineComment },
    { key: "Mod-k Mod-c", run: commentLines },
    { key: "Mod-k c", run: commentLines },
    { key: "Mod-k Mod-u", run: uncommentLines },
    { key: "Mod-k u", run: uncommentLines },
    // Comment / uncomment selected lines. Ctrl is bound too so it also
    // works on macOS, where Mod is Cmd.
    { key: "Mod-Shift-k", run: commentLines, preventDefault: true },
    { key: "Ctrl-Shift-k", run: commentLines, preventDefault: true },
    { key: "Mod-Shift-u", run: uncommentLines, preventDefault: true },
    { key: "Ctrl-Shift-u", run: uncommentLines, preventDefault: true },
  ]),
);

const JsonEditor = forwardRef<JsonEditorHandle, Props>(function JsonEditor(
  {
    value,
    onChange,
    readOnly = false,
    placeholder,
    markers,
    language = "json",
    fontSize = 13,
    onUserSelect,
  },
  handleRef,
) {
  const ref = useRef<ReactCodeMirrorRef>(null);
  const { theme } = useTheme();
  const zen = useZen();
  const onUserSelectRef = useRef(onUserSelect);
  onUserSelectRef.current = onUserSelect;

  useImperativeHandle(handleRef, () => ({
    focusRange(from: number, to: number, opts?: { focus?: boolean }) {
      const view = ref.current?.view;
      if (!view) return;
      const len = view.state.doc.length;
      const a = Math.max(0, Math.min(from, len));
      const b = Math.max(a, Math.min(to, len));
      view.dispatch({
        selection: EditorSelection.range(a, b),
        scrollIntoView: true,
      });
      if (opts?.focus !== false) view.focus();
    },
    setFindMatches(matches, active) {
      const view = ref.current?.view;
      if (!view) return;
      const len = view.state.doc.length;
      const ranges = matches
        .map((m, i) => ({
          from: Math.min(m.from, len),
          to: Math.min(m.to, len),
          i,
        }))
        .filter((m) => m.to > m.from)
        .map((m) =>
          (m.i === active ? findActiveMark : findMatchMark).range(m.from, m.to),
        );
      view.dispatch({
        effects: setFindMatchesEffect.of(Decoration.set(ranges, true)),
      });
    },
  }));

  const extensions = useMemo(() => {
    const ext = [
      wrap,
      clickableLineNumbers,
      commentKeymap,
      findMatchesField,
      findTheme,
      EditorView.updateListener.of((u) => {
        if (
          u.selectionSet &&
          u.transactions.some((t) => t.isUserEvent("select"))
        ) {
          onUserSelectRef.current?.(u.state.selection.main.head);
        }
      }),
    ];
    if (language === "json") {
      // foldGutter added here (after the line numbers) so the fold chevrons
      // sit to the right of the row numbers.
      // foldGutter right after the line numbers (before lintGutter) so the
      // chevrons sit directly beside the row numbers.
      ext.push(
        json(),
        foldChevrons,
        lintGutter(),
        commentHighlighter,
        commentTheme,
        gutterTheme,
      );
      if (zen) ext.push(...zenEditorExtensions);
    }
    return ext;
  }, [language, zen]);

  // Re-apply diagnostics whenever markers change.
  useEffect(() => {
    const view = ref.current?.view;
    if (!view) return;
    const docLen = view.state.doc.length;
    const diagnostics: Diagnostic[] = (markers ?? []).map((m) => ({
      from: Math.min(m.from, docLen),
      to: Math.min(Math.max(m.to, m.from + 1), docLen),
      severity: m.severity ?? "error",
      message: m.message,
    }));
    view.dispatch(setDiagnostics(view.state, diagnostics));
  }, [markers, value]);

  return (
    <CodeMirror
      ref={ref}
      value={value}
      theme={theme === "light" ? githubLight : githubDark}
      readOnly={readOnly}
      editable={!readOnly}
      placeholder={placeholder}
      extensions={extensions}
      basicSetup={{
        lineNumbers: false, // provided by clickableLineNumbers instead
        highlightActiveLine: !readOnly,
        foldGutter: false, // provided explicitly (right of the line numbers)
        autocompletion: false,
        highlightActiveLineGutter: !readOnly,
        searchKeymap: false, // Cmd/Ctrl+F opens our unified Find modal instead
      }}
      onChange={onChange}
      style={{ height: "100%", fontSize }}
      height="100%"
    />
  );
});

export default JsonEditor;
