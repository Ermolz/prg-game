import { useState, useEffect, useRef, useMemo } from 'react';
import type { State, Edge } from '../model/types';
import { normalizeEdge, edgeKey } from '../model/normalizeEdge';
import {
  BOX_COLORS,
  BOX_STROKES,
  card,
  palette,
  BOARD_PAD,
  MIN_BOARD_PX,
  MAX_BOARD_PX,
  calcBoardLayout,
} from '../lib/constants';

const HITBOX_STROKE_WIDTH = 28;
const VISIBLE_STROKE_WIDTH = 10;
const HOVER_STROKE_WIDTH = 16; // baseW + 6

type GameBoardProps = {
  state: State;
  possibleEdges: Edge[];
  boxOwners: Record<string, number>;
  onEdgeClick: (edge: Edge) => void;
  disabled?: boolean;
};

export function GameBoard({
  state,
  possibleEdges,
  boxOwners,
  onEdgeClick,
  disabled = false,
}: GameBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState({
    boardPx: 400,
    cellSize: 48,
    offsetX: 0,
    offsetY: 0,
    containerW: 400,
    containerH: 400,
  });
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);

  const nx = state.nx;
  const ny = state.ny;
  const edgeSet = useMemo(
    () => new Set(state.edges.map((e) => edgeKey(normalizeEdge(e)))),
    [state.edges]
  );

  const { boardPx, cellSize, offsetX, offsetY, containerW, containerH } = layout;
  const dotR = Math.max(2.5, cellSize * 0.08);
  const ox = offsetX + dotR;
  const oy = offsetY + dotR;
  /** SVG element size: square, never larger than container (avoids overflow + ensures no stretch) */
  const svgSize = Math.min(boardPx, containerW, containerH);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width: w, height: h } = entries[0]?.contentRect ?? { width: 0, height: 0 };
      if (w <= 0 || h <= 0) return;
      const result = calcBoardLayout({
        containerW: w,
        containerH: h,
        nx,
        ny,
        padding: BOARD_PAD,
        minBoardPx: MIN_BOARD_PX,
        maxBoardPx: MAX_BOARD_PX,
      });
      setLayout({
        boardPx: result.boardPx,
        cellSize: result.cell,
        offsetX: result.offsetX,
        offsetY: result.offsetY,
        containerW: result.containerW,
        containerH: result.containerH,
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [nx, ny]);

  const isClickable = (key: string) =>
    !edgeSet.has(key) && possibleEdges.some((p) => edgeKey(normalizeEdge(p)) === key);

  const strokeColor = (_key: string, filled: boolean, clickable: boolean) => {
    if (filled) return palette.edgeFilled;
    if (disabled) return palette.edgeDisabled;
    if (clickable) return palette.edgeAvailable;
    return palette.edgeDisabled;
  };

  return (
    <section className={`${card} flex flex-1 min-h-0 justify-center items-center p-2`}>
      <div
        ref={containerRef}
        className="w-full h-full min-h-[280px] flex items-center justify-center"
      >
        <svg
          width={svgSize}
          height={svgSize}
          viewBox={`0 0 ${boardPx} ${boardPx}`}
          preserveAspectRatio="xMidYMid meet"
          className="rounded overflow-visible shrink-0"
        >
          <defs>
            <filter id="dotShadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="0.5" stdDeviation="0.8" floodOpacity="0.25" />
            </filter>
          </defs>

          {/* Closed boxes */}
          {Array.from({ length: nx }, (_, x) =>
            Array.from({ length: ny }, (_, y) => {
              const k = `${x},${y}`;
              const owner = boxOwners[k];
              if (!owner) return null;
              const fill = BOX_COLORS[owner] ?? palette.player1Fill;
              const stroke = BOX_STROKES[owner] ?? palette.player1Stroke;
              return (
                <rect
                  key={`box-${k}`}
                  x={ox + x * cellSize + 2}
                  y={oy + y * cellSize + 2}
                  width={cellSize - 4}
                  height={cellSize - 4}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={1}
                />
              );
            })
          )}

          {/* Dots */}
          {Array.from({ length: nx + 1 }, (_, i) =>
            Array.from({ length: ny + 1 }, (_, j) => (
              <g key={`d-${i}-${j}`}>
                <circle
                  cx={ox + i * cellSize}
                  cy={oy + j * cellSize}
                  r={dotR}
                  fill={palette.dotFill}
                  filter="url(#dotShadow)"
                />
                <circle
                  cx={ox + i * cellSize}
                  cy={oy + j * cellSize}
                  r={dotR}
                  fill="none"
                  stroke={palette.dotStroke}
                  strokeWidth={0.8}
                />
              </g>
            ))
          )}

          {/* Visible edges (layer 1) */}
          {[
            ...Array.from({ length: nx }, (_, x) =>
              Array.from({ length: ny + 1 }, (_, y) => {
                const e = normalizeEdge({ a: { x, y }, b: { x: x + 1, y } });
                const key = edgeKey(e);
                const filled = edgeSet.has(key);
                const clickable = isClickable(key);
                const color = strokeColor(key, filled, clickable);
                return (
                  <line
                    key={`v-${key}`}
                    x1={ox + x * cellSize}
                    y1={oy + y * cellSize}
                    x2={ox + (x + 1) * cellSize}
                    y2={oy + y * cellSize}
                    stroke={color}
                    strokeWidth={VISIBLE_STROKE_WIDTH}
                    strokeLinecap="round"
                    className={filled ? 'transition-opacity duration-150' : ''}
                  />
                );
              })
            ).flat(),
            ...Array.from({ length: nx + 1 }, (_, x) =>
              Array.from({ length: ny }, (_, y) => {
                const e = normalizeEdge({ a: { x, y }, b: { x, y: y + 1 } });
                const key = edgeKey(e);
                const filled = edgeSet.has(key);
                const clickable = isClickable(key);
                const color = strokeColor(key, filled, clickable);
                return (
                  <line
                    key={`v-${key}`}
                    x1={ox + x * cellSize}
                    y1={oy + y * cellSize}
                    x2={ox + x * cellSize}
                    y2={oy + (y + 1) * cellSize}
                    stroke={color}
                    strokeWidth={VISIBLE_STROKE_WIDTH}
                    strokeLinecap="round"
                    className={filled ? 'transition-opacity duration-150' : ''}
                  />
                );
              })
            ).flat(),
          ]}

          {/* Hover preview */}
          {hoveredEdge && (() => {
            const parts = hoveredEdge.split('-');
            if (parts.length !== 2) return null;
            const a = parts[0].split(',').map(Number);
            const b = parts[1].split(',').map(Number);
            if (a.length !== 2 || b.length !== 2) return null;
            const [ax, ay] = a;
            const [bx, by] = b;
            return (
              <line
                key="hover-preview"
                x1={ox + ax * cellSize}
                y1={oy + ay * cellSize}
                x2={ox + bx * cellSize}
                y2={oy + by * cellSize}
                stroke="rgba(80,140,255,0.55)"
                strokeWidth={HOVER_STROKE_WIDTH}
                strokeLinecap="round"
                pointerEvents="none"
              />
            );
          })()}

          {/* Hitbox layer (on top for pointer events) */}
          {[
            ...Array.from({ length: nx }, (_, x) =>
              Array.from({ length: ny + 1 }, (_, y) => {
                const e = normalizeEdge({ a: { x, y }, b: { x: x + 1, y } });
                const key = edgeKey(e);
                const clickable = isClickable(key);
                return (
                  <line
                    key={`h-${key}`}
                    x1={ox + x * cellSize}
                    y1={oy + y * cellSize}
                    x2={ox + (x + 1) * cellSize}
                    y2={oy + y * cellSize}
                    stroke="transparent"
                    strokeWidth={HITBOX_STROKE_WIDTH}
                    strokeLinecap="round"
                    pointerEvents="stroke"
                    cursor={clickable ? 'pointer' : 'default'}
                    onClick={() => clickable && !disabled && onEdgeClick(e)}
                    onMouseEnter={() => clickable && setHoveredEdge(key)}
                    onMouseLeave={() => setHoveredEdge(null)}
                    onPointerDown={() => clickable && setHoveredEdge(key)}
                    onPointerUp={() => setHoveredEdge(null)}
                    onPointerLeave={() => setHoveredEdge(null)}
                  />
                );
              })
            ).flat(),
            ...Array.from({ length: nx + 1 }, (_, x) =>
              Array.from({ length: ny }, (_, y) => {
                const e = normalizeEdge({ a: { x, y }, b: { x, y: y + 1 } });
                const key = edgeKey(e);
                const clickable = isClickable(key);
                return (
                  <line
                    key={`h-${key}`}
                    x1={ox + x * cellSize}
                    y1={oy + y * cellSize}
                    x2={ox + x * cellSize}
                    y2={oy + (y + 1) * cellSize}
                    stroke="transparent"
                    strokeWidth={HITBOX_STROKE_WIDTH}
                    strokeLinecap="round"
                    pointerEvents="stroke"
                    cursor={clickable ? 'pointer' : 'default'}
                    onClick={() => clickable && !disabled && onEdgeClick(e)}
                    onMouseEnter={() => clickable && setHoveredEdge(key)}
                    onMouseLeave={() => setHoveredEdge(null)}
                    onPointerDown={() => clickable && setHoveredEdge(key)}
                    onPointerUp={() => setHoveredEdge(null)}
                    onPointerLeave={() => setHoveredEdge(null)}
                  />
                );
              })
            ).flat(),
          ]}
        </svg>
      </div>
    </section>
  );
}
