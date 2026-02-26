import { useState, useEffect, useCallback } from 'react';
import type { State, Edge, Box } from '../model/types';
import { normalizeEdge, edgeKey, edgesEqual } from '../model/normalizeEdge';
import { boxKey } from '../lib/utils';

export function useGameState() {
  const [state, setState] = useState<State | null>(null);
  const [moveHistory, setMoveHistory] = useState<Edge[]>([]);
  const [possibleEdges, setPossibleEdges] = useState<Edge[]>([]);
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [boxOwners, setBoxOwners] = useState<Record<string, number>>({});
  const [engineStatus, setEngineStatus] = useState<'starting' | 'ready' | 'down' | 'restarting'>('down');

  useEffect(() => {
    if (!window.dab?.onEngineStatus) return;
    window.dab.onEngineStatus(setEngineStatus);
    window.dab.getEngineStatus?.().then(setEngineStatus).catch(() => {});
  }, []);

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
    setBusy(true);
    try {
      await window.dab.setEngine('csharp');
      const res = await window.dab.newGame(nx, ny);
      const s = res?.state ?? res;
      if (!s) {
        setError('Invalid init response: no state');
        setBusy(false);
        return;
      }
      setState(s);
      const { edges } = await window.dab.possibleMoves(s);
      setPossibleEdges(edges);
      const { gameOver } = await window.dab.gameOver(s);
      setOver(gameOver);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    loadGame(2, 2);
  }, [loadGame]);

  const onEdgeClick = useCallback(
    async (edge: Edge) => {
      if (!state || busy || over) return;
      const norm = normalizeEdge(edge);
      const allowed = possibleEdges.some((e) => edgesEqual(e, norm));
      if (!allowed) return;
      setBusy(true);
      setError(null);
      try {
        const res = await window.dab.applyMove(state, norm);
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
        setPossibleEdges(edges);
        const { gameOver } = await window.dab.gameOver(res.state);
        setOver(gameOver);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    },
    [state, possibleEdges, busy, over]
  );

  const onBotMove = useCallback(async () => {
    if (!state || busy || over) return;
    setBusy(true);
    setError(null);
    try {
      const res = await window.dab.botMoveUnified({
        nx: state.nx,
        ny: state.ny,
        history: moveHistory,
      });
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
      setPossibleEdges(edges);
      const { gameOver } = await window.dab.gameOver(res.state);
      setOver(gameOver);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [state, moveHistory, busy, over]);

  return {
    state,
    possibleEdges,
    over,
    error,
    busy,
    boxOwners,
    engineStatus,
    loadGame,
    onEdgeClick,
    onBotMove,
  };
}
