import { useState, useEffect, useCallback } from 'react';
import type { State, Edge, Box, SaveGamePayload } from '../model/types';
import { normalizeEdge, edgesEqual } from '../model/normalizeEdge';
import { boxKey } from '../lib/utils';
import { loadSettings } from '../lib/settingsStorage';

export function useGameState() {
  const [state, setState] = useState<State | null>(null);
  const [moveHistory, setMoveHistory] = useState<Edge[]>([]);
  const [redoStack, setRedoStack] = useState<Edge[]>([]);
  const [possibleEdges, setPossibleEdges] = useState<Edge[]>([]);
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [boxOwners, setBoxOwners] = useState<Record<string, number>>({});
  const [gameEngineStatus, setGameEngineStatus] = useState<'starting' | 'ready' | 'down' | 'restarting'>('down');
  const [botEngineStatus, setBotEngineStatus] = useState<'starting' | 'ready' | 'down' | 'restarting'>('down');
  const engineStatus = gameEngineStatus;

  useEffect(() => {
    window.dab?.onGameEngineStatus?.(setGameEngineStatus);
    window.dab?.onBotEngineStatus?.(setBotEngineStatus);
    window.dab?.getGameEngineStatus?.().then(setGameEngineStatus).catch(() => {});
    window.dab?.getBotEngineStatus?.().then(setBotEngineStatus).catch(() => {});
  }, []);

  const applyReplay = useCallback(
    async (nx: number, ny: number, history: Edge[]) => {
      if (!window.dab?.replay) return;
      const { state: s, boxOwners: bo, gameOver: go } = await window.dab.replay({ nx, ny, history });
      setState(s as State);
      setBoxOwners(bo ?? {});
      setOver(go ?? false);
      if (s != null) {
        const { edges } = await window.dab.possibleMoves(s);
        setPossibleEdges(edges ?? []);
      } else {
        setPossibleEdges([]);
      }
    },
    []
  );

  const loadGame = useCallback(async (nx: number, ny: number) => {
    if (!window.dab) {
      setError(
        'Engine API (window.dab) not available. Run from ui-electron: npm run build:electron'
      );
      return;
    }
    setError(null);
    setBoxOwners({});
    setMoveHistory([]);
    setRedoStack([]);
    setBusy(true);
    try {
      const res = await window.dab.newGame(nx, ny);
      const s = res?.state ?? res;
      if (!s) {
        setError(
          'Engine did not respond. Try "Restart engines" in Settings, then start a new game. For Java: run "cd src/java && ./gradlew shadowJar" once.'
        );
        setBusy(false);
        return;
      }
      setState(s);
      const { edges } = await window.dab.possibleMoves(s);
      setPossibleEdges(edges ?? []);
      const { gameOver } = await window.dab.gameOver(s);
      setOver(gameOver ?? false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    const s = loadSettings();
    loadGame(s.defaultNx, s.defaultNy);
  }, [loadGame]);

  const undo = useCallback(async () => {
    if (!state || busy || moveHistory.length === 0) return;
    const last = moveHistory[moveHistory.length - 1];
    const newHistory = moveHistory.slice(0, -1);
    setMoveHistory(newHistory);
    setRedoStack((prev) => [...prev, last]);
    setBusy(true);
    setError(null);
    try {
      await applyReplay(state.nx, state.ny, newHistory);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setMoveHistory(moveHistory);
      setRedoStack((prev) => prev.slice(0, -1));
    } finally {
      setBusy(false);
    }
  }, [state, moveHistory, busy, applyReplay]);

  const redo = useCallback(async () => {
    if (!state || busy || redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    const newHistory = [...moveHistory, next];
    setMoveHistory(newHistory);
    setRedoStack((prev) => prev.slice(0, -1));
    setBusy(true);
    setError(null);
    try {
      await applyReplay(state.nx, state.ny, newHistory);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setMoveHistory((prev) => prev.slice(0, -1));
      setRedoStack((prev) => [...prev, next]);
    } finally {
      setBusy(false);
    }
  }, [state, moveHistory, redoStack, busy, applyReplay]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        undo();
      } else if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  const saveGame = useCallback(
    async (settingsSnapshot: Partial<{ gameEngine: string; botEngine: string; gameMode: string }>) => {
      if (!state || !window.dab?.saveGame) return { error: 'Not available' };
      const payload: SaveGamePayload = {
        version: 1,
        nx: state.nx,
        ny: state.ny,
        moveHistory,
        timestamp: new Date().toISOString(),
        settings: settingsSnapshot as SaveGamePayload['settings'],
      };
      const result = await window.dab.saveGame(payload);
      return result as { path?: string; error?: string };
    },
    [state, moveHistory]
  );

  const loadSavedGame = useCallback(
    async (settingsApply?: (s: unknown) => void) => {
      if (!window.dab?.loadGame) return { error: 'Not available' };
      const result = await window.dab.loadGame();
      const data = result as { version?: number; nx?: number; ny?: number; moveHistory?: Edge[]; settings?: unknown; error?: string };
      if (data.error) return result as { error: string };
      if (data.version !== 1 || typeof data.nx !== 'number' || typeof data.ny !== 'number' || !Array.isArray(data.moveHistory)) {
        return { error: 'Invalid save format' };
      }
      if (data.settings && settingsApply) settingsApply(data.settings);
      setError(null);
      setMoveHistory(data.moveHistory);
      setRedoStack([]);
      setBusy(true);
      try {
        await applyReplay(data.nx, data.ny, data.moveHistory);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
      return {};
    },
    [applyReplay]
  );

  /** Re-sync game engine with current board (replay only). Use after restart or after changing engine in Settings. */
  const syncGameEngine = useCallback(async () => {
    if (!state || !window.dab?.replay) return;
    setBusy(true);
    setError(null);
    try {
      await window.dab.replay({ nx: state.nx, ny: state.ny, history: moveHistory });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [state, moveHistory]);

  /** Restart both engines and re-sync game engine with current board so next moves don't get "Not initialized" / "Engine stopped". */
  const onRestartEngines = useCallback(async () => {
    if (!window.dab?.restartEngines) return;
    setBusy(true);
    setError(null);
    try {
      await window.dab.restartEngines();
      if (state && moveHistory.length >= 0 && window.dab.replay) {
        await window.dab.replay({ nx: state.nx, ny: state.ny, history: moveHistory });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [state, moveHistory]);

  function isEngineRecoverableError(e: unknown): boolean {
    const msg = e instanceof Error ? e.message : String(e);
    return /Engine stopped|Not initialized/i.test(msg);
  }

  /** Restart both engines and replay to re-sync game state; then retry. Use after "Engine stopped" / "Not initialized". */
  const recoverEnginesAndReplay = useCallback(async (): Promise<boolean> => {
    if (!state || !window.dab?.restartEngines || !window.dab?.replay) return false;
    try {
      await window.dab.restartEngines();
      await window.dab.replay({ nx: state.nx, ny: state.ny, history: moveHistory });
      return true;
    } catch {
      return false;
    }
  }, [state, moveHistory]);

  const onEdgeClick = useCallback(
    async (edge: Edge) => {
      if (!state || busy || over) return;
      const norm = normalizeEdge(edge);
      const allowed = possibleEdges.some((e) => edgesEqual(e, norm));
      if (!allowed) return;
      setBusy(true);
      setError(null);
      const doMove = async () => {
        const res = await window.dab!.applyMove(state, norm);
        if (!res?.state) {
          setError('Engine did not respond (try restarting the engine)');
          return;
        }
        setMoveHistory((prev) => [...prev, norm]);
        setState(res.state);
        if (res.closedBoxes?.length) {
          const whoClosed = res.extraTurn ? res.state.player : (3 - res.state.player);
          setBoxOwners((prev: Record<string, number>) => {
            const next = { ...prev };
            res.closedBoxes!.forEach((b: Box) => (next[boxKey(b)] = whoClosed));
            return next;
          });
        }
        const { edges } = await window.dab.possibleMoves(res.state);
        setPossibleEdges(edges ?? []);
        const { gameOver } = await window.dab.gameOver(res.state);
        setOver(gameOver ?? false);
      };
      try {
        await doMove();
      } catch (e) {
        if (isEngineRecoverableError(e)) {
          const ok = await recoverEnginesAndReplay();
          if (ok) {
            try {
              await doMove();
            } catch (retryErr) {
              setError(retryErr instanceof Error ? retryErr.message : String(retryErr));
            }
          } else {
            setError(e instanceof Error ? e.message : String(e));
          }
        } else {
          setError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        setBusy(false);
      }
    },
    [state, possibleEdges, busy, over, moveHistory, recoverEnginesAndReplay]
  );

  const onBotMove = useCallback(async () => {
    if (!state || busy || over) return;
    setRedoStack([]);
    setBusy(true);
    setError(null);
    const doBotMove = async () => {
      const res = await window.dab!.botMoveUnified({
        nx: state.nx,
        ny: state.ny,
        history: moveHistory,
      });
      if (!res?.state || !res?.move) {
        setError('Engine did not respond (try restarting the engine)');
        return;
      }
      const moveNorm = normalizeEdge(res.move);
      setMoveHistory((prev) => [...prev, moveNorm]);
      setState(res.state);
      if (res.closedBoxes?.length) {
        const whoClosed = res.extraTurn ? res.state.player : 3 - res.state.player;
        setBoxOwners((prev: Record<string, number>) => {
          const next = { ...prev };
          res.closedBoxes!.forEach((b: Box) => (next[boxKey(b)] = whoClosed));
          return next;
        });
      }
      const { edges } = await window.dab.possibleMoves(res.state);
      setPossibleEdges(edges ?? []);
      const { gameOver } = await window.dab.gameOver(res.state);
      setOver(gameOver ?? false);
    };
    try {
      await doBotMove();
    } catch (e) {
      if (isEngineRecoverableError(e)) {
        const ok = await recoverEnginesAndReplay();
        if (ok) {
          try {
            await doBotMove();
          } catch (retryErr) {
            setError(retryErr instanceof Error ? retryErr.message : String(retryErr));
          }
        } else {
          setError(e instanceof Error ? e.message : String(e));
        }
      } else {
        setError(e instanceof Error ? e.message : String(e));
      }
    } finally {
      setBusy(false);
    }
  }, [state, moveHistory, busy, over, recoverEnginesAndReplay]);

  return {
    state,
    possibleEdges,
    over,
    error,
    busy,
    boxOwners,
    engineStatus,
    gameEngineStatus,
    botEngineStatus,
    moveHistory,
    redoStack,
    loadGame,
    undo,
    redo,
    onEdgeClick,
    onBotMove,
    saveGame,
    loadSavedGame,
    syncGameEngine,
    onRestartEngines,
  };
}
