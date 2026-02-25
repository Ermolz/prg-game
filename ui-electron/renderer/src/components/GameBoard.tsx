import type { State, Edge } from '../model/types';
import { normalizeEdge, edgeKey, edgesEqual } from '../model/normalizeEdge';
import { BOX_COLORS, card, CELL, DOT_R } from '../lib/constants';

type GameBoardProps = {
  state: State;
  possibleEdges: Edge[];
  boxOwners: Record<string, number>;
  onEdgeClick: (edge: Edge) => void;
};

export function GameBoard({ state, possibleEdges, boxOwners, onEdgeClick }: GameBoardProps) {
  const edgeSet = new Set(state.edges.map((e) => edgeKey(normalizeEdge(e))));
  const nx = state.nx;
  const ny = state.ny;

  return (
    <section className={`${card} flex justify-center`}>
      <svg
        width={nx * CELL + 2 * DOT_R}
        height={ny * CELL + 2 * DOT_R}
        className="rounded border border-gray-200"
      >
        {/* Closed boxes by player */}
        {Array.from({ length: nx }, (_, x) =>
          Array.from({ length: ny }, (_, y) => {
            const k = `${x},${y}`;
            const owner = boxOwners[k];
            if (!owner) return null;
            const fill = BOX_COLORS[owner] ?? '#eee';
            return (
              <rect
                key={`box-${k}`}
                x={DOT_R + x * CELL + 2}
                y={DOT_R + y * CELL + 2}
                width={CELL - 4}
                height={CELL - 4}
                fill={fill}
                stroke="none"
              />
            );
          })
        )}
        {/* Dots */}
        {Array.from({ length: nx + 1 }, (_, i) =>
          Array.from({ length: ny + 1 }, (_, j) => (
            <circle
              key={`d-${i}-${j}`}
              cx={DOT_R + i * CELL}
              cy={DOT_R + j * CELL}
              r={DOT_R}
              fill="#333"
            />
          ))
        )}
        {/* Horizontal edges */}
        {Array.from({ length: nx }, (_, x) =>
          Array.from({ length: ny + 1 }, (_, y) => {
            const e = normalizeEdge({ a: { x, y }, b: { x: x + 1, y } });
            const key = edgeKey(e);
            const filled = edgeSet.has(key);
            const clickable =
              !filled && possibleEdges.some((p) => edgeKey(normalizeEdge(p)) === key);
            return (
              <line
                key={key}
                x1={DOT_R + x * CELL}
                y1={DOT_R + y * CELL}
                x2={DOT_R + (x + 1) * CELL}
                y2={DOT_R + y * CELL}
                stroke={filled ? '#333' : clickable ? '#2563eb' : '#d1d5db'}
                strokeWidth={filled ? 3 : 2}
                className={clickable ? 'cursor-pointer' : ''}
                onClick={() => clickable && onEdgeClick(e)}
              />
            );
          })
        )}
        {/* Vertical edges */}
        {Array.from({ length: nx + 1 }, (_, x) =>
          Array.from({ length: ny }, (_, y) => {
            const e = normalizeEdge({ a: { x, y }, b: { x, y: y + 1 } });
            const key = edgeKey(e);
            const filled = edgeSet.has(key);
            const clickable =
              !filled && possibleEdges.some((p) => edgeKey(normalizeEdge(p)) === key);
            return (
              <line
                key={key}
                x1={DOT_R + x * CELL}
                y1={DOT_R + y * CELL}
                x2={DOT_R + x * CELL}
                y2={DOT_R + (y + 1) * CELL}
                stroke={filled ? '#333' : clickable ? '#2563eb' : '#d1d5db'}
                strokeWidth={filled ? 3 : 2}
                className={clickable ? 'cursor-pointer' : ''}
                onClick={() => clickable && onEdgeClick(e)}
              />
            );
          })
        )}
      </svg>
    </section>
  );
}
