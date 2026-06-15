"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import {
  MergeView,
  goToNextChunk,
  goToPreviousChunk,
} from "@codemirror/merge";
import { EditorView, lineNumbers } from "@codemirror/view";
import { json } from "@codemirror/lang-json";
import { githubDark, githubLight } from "@uiw/codemirror-theme-github";
import { useTheme } from "./theme";

interface Props {
  left: string;
  right: string;
  onLeftChange: (v: string) => void;
  onRightChange: (v: string) => void;
  /** When false, diff highlights are hidden (e.g. the right side is empty). */
  showDiff?: boolean;
}

export interface MergeEditorHandle {
  next: () => void;
  prev: () => void;
}

/**
 * A side-by-side merge view (CodeMirror) that highlights differences inline in
 * the two editors — added/removed/changed chunks are coloured in the text with
 * connecting markers, instead of a separate diff output.
 */
const MergeEditor = forwardRef<MergeEditorHandle, Props>(function MergeEditor(
  { left, right, onLeftChange, onRightChange, showDiff = true },
  handleRef,
) {
  const ref = useRef<HTMLDivElement>(null);
  const mvRef = useRef<MergeView | null>(null);
  const { theme } = useTheme();

  useImperativeHandle(handleRef, () => ({
    next() {
      const mv = mvRef.current;
      if (mv) {
        mv.b.focus();
        goToNextChunk(mv.b);
      }
    },
    prev() {
      const mv = mvRef.current;
      if (mv) {
        mv.b.focus();
        goToPreviousChunk(mv.b);
      }
    },
  }));
  const cbs = useRef({ onLeftChange, onRightChange });
  cbs.current = { onLeftChange, onRightChange };
  // Latest docs, so a theme-driven rebuild seeds from current content.
  const docs = useRef({ left, right });
  docs.current = { left, right };

  useEffect(() => {
    if (!ref.current) return;
    const cmTheme = theme === "light" ? githubLight : githubDark;
    const common = [lineNumbers(), EditorView.lineWrapping, json(), cmTheme];

    const mv = new MergeView({
      a: {
        doc: docs.current.left,
        extensions: [
          ...common,
          EditorView.updateListener.of((u) => {
            if (u.docChanged) cbs.current.onLeftChange(u.state.doc.toString());
          }),
        ],
      },
      b: {
        doc: docs.current.right,
        extensions: [
          ...common,
          EditorView.updateListener.of((u) => {
            if (u.docChanged) cbs.current.onRightChange(u.state.doc.toString());
          }),
        ],
      },
      parent: ref.current,
      gutter: true,
      highlightChanges: true,
      collapseUnchanged: { margin: 3, minSize: 4 },
    });
    mvRef.current = mv;
    return () => {
      mv.destroy();
      mvRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  // Sync external value → editors (e.g. "Load document", "Format both").
  useEffect(() => {
    const mv = mvRef.current;
    if (mv && mv.a.state.doc.toString() !== left) {
      mv.a.dispatch({ changes: { from: 0, to: mv.a.state.doc.length, insert: left } });
    }
  }, [left]);
  useEffect(() => {
    const mv = mvRef.current;
    if (mv && mv.b.state.doc.toString() !== right) {
      mv.b.dispatch({ changes: { from: 0, to: mv.b.state.doc.length, insert: right } });
    }
  }, [right]);

  return (
    <div
      ref={ref}
      className={`h-full min-h-0 overflow-hidden ${showDiff ? "" : "diff-hidden"}`}
    />
  );
});

export default MergeEditor;
