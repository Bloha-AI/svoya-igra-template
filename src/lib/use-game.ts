"use client";

import { useCallback, useEffect, useReducer, useState } from "react";
import {
  gameReducer,
  initialState,
  parseSavedGame,
  serializeGame,
  storageKey,
  type GameState,
  type Settings,
} from "./game-state";

export function useGame() {
  const [state, dispatch] = useReducer(gameReducer, undefined, () =>
    initialState(),
  );
  const [savedGame, setSavedGame] = useState<GameState | null>(null);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const timerRunning = state.current?.running;
  const questionId = state.current?.id;
  const playing = state.status === "playing";
  useEffect(() => {
    let mounted = true;
    queueMicrotask(() => {
      if (!mounted) return;
      try {
        const raw = localStorage.getItem(storageKey);
        const saved = raw ? parseSavedGame(raw) : null;
        if (saved && saved.status !== "setup") setSavedGame(saved);
      } catch {
        setStorageError(true);
      }
      setReady(true);
    });
    return () => {
      mounted = false;
    };
  }, []);
  useEffect(() => {
    if (!ready || savedGame || state.status === "setup") return;
    try {
      localStorage.setItem(storageKey, serializeGame(state));
    } catch {
      queueMicrotask(() => setStorageError(true));
    }
  }, [state, ready, savedGame]);
  useEffect(() => {
    if (!timerRunning || !playing) return;
    let previous = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      dispatch({ type: "tick", elapsedMs: now - previous });
      previous = now;
    }, 200);
    return () => window.clearInterval(timer);
  }, [timerRunning, questionId, playing]);
  useEffect(() => {
    const pause = () => {
      if (document.hidden) dispatch({ type: "timer", running: false });
    };
    document.addEventListener("visibilitychange", pause);
    return () => document.removeEventListener("visibilitychange", pause);
  }, []);
  const start = useCallback((names: string[], settings: Settings) => {
    setSavedGame(null);
    dispatch({ type: "start", names, settings });
  }, []);
  const resume = () => {
    if (savedGame) {
      dispatch({ type: "restore", state: savedGame });
      setSavedGame(null);
    }
  };
  return { state, dispatch, savedGame, ready, storageError, start, resume };
}
