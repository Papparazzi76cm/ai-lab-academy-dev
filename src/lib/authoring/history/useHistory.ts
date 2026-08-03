import { useState, useCallback } from "react";
import type { AuthoringBlock } from "../types";

const MAX_HISTORY_STEPS = 100;

export interface HistoryState {
  past: AuthoringBlock[][];
  present: AuthoringBlock[];
  future: AuthoringBlock[][];
}

export function useHistory(initialBlocks: AuthoringBlock[]) {
  const [history, setHistory] = useState<HistoryState>({
    past: [],
    present: initialBlocks,
    future: [],
  });

  const pushState = useCallback((newBlocks: AuthoringBlock[]) => {
    setHistory((prev) => {
      // Don't push duplicate states
      if (JSON.stringify(prev.present) === JSON.stringify(newBlocks)) {
        return prev;
      }
      const newPast = [...prev.past, prev.present].slice(-MAX_HISTORY_STEPS);
      return {
        past: newPast,
        present: newBlocks,
        future: [],
      };
    });
  }, []);

  const undo = useCallback(() => {
    setHistory((prev) => {
      if (prev.past.length === 0) return prev;
      const previous = prev.past[prev.past.length - 1];
      const newPast = prev.past.slice(0, prev.past.length - 1);
      return {
        past: newPast,
        present: previous,
        future: [prev.present, ...prev.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((prev) => {
      if (prev.future.length === 0) return prev;
      const next = prev.future[0];
      const newFuture = prev.future.slice(1);
      return {
        past: [...prev.past, prev.present],
        present: next,
        future: newFuture,
      };
    });
  }, []);

  const resetHistory = useCallback((newBlocks: AuthoringBlock[]) => {
    setHistory({
      past: [],
      present: newBlocks,
      future: [],
    });
  }, []);

  return {
    blocks: history.present,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    pushState,
    undo,
    redo,
    resetHistory,
  };
}
