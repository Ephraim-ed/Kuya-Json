import { useCallback, useRef, useState } from "react";

interface HistoryState {
  past: string[];
  present: string;
  future: string[];
}

const LIMIT = 100;

/**
 * Undo/redo stack for a single text document. `set` pushes a new value (coalescing
 * is left to the caller via debouncing). Returns helpers and capability flags.
 */
export function useHistory(initial: string) {
  const [state, setState] = useState<HistoryState>({
    past: [],
    present: initial,
    future: [],
  });
  // Track the latest present to avoid pushing duplicates.
  const presentRef = useRef(initial);
  presentRef.current = state.present;
  // Coalesce rapid edits (typing) into a single undo step.
  const lastEdit = useRef(0);

  const set = useCallback((value: string) => {
    setState((s) => {
      if (value === s.present) return s;
      const now = Date.now();
      // Within the coalesce window, update present without a new undo entry.
      const coalesce = now - lastEdit.current < 500 && s.past.length > 0;
      lastEdit.current = now;
      const past = coalesce ? s.past : [...s.past, s.present].slice(-LIMIT);
      return { past, present: value, future: [] };
    });
  }, []);

  /** Replace the present value without creating an undo step (programmatic). */
  const replace = useCallback((value: string) => {
    lastEdit.current = 0;
    setState((s) => ({ ...s, present: value }));
  }, []);

  const undo = useCallback(() => {
    setState((s) => {
      if (s.past.length === 0) return s;
      const previous = s.past[s.past.length - 1];
      return {
        past: s.past.slice(0, -1),
        present: previous,
        future: [s.present, ...s.future].slice(0, LIMIT),
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState((s) => {
      if (s.future.length === 0) return s;
      const next = s.future[0];
      return {
        past: [...s.past, s.present].slice(-LIMIT),
        present: next,
        future: s.future.slice(1),
      };
    });
  }, []);

  const reset = useCallback((value: string) => {
    lastEdit.current = 0;
    setState({ past: [], present: value, future: [] });
  }, []);

  return {
    value: state.present,
    set,
    replace,
    undo,
    redo,
    reset,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  };
}
