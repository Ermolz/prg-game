// Palette (Tailwind-compatible where possible; raw values for SVG)
export const palette = {
  bgPage: 'bg-gray-50',
  bgCard: 'bg-white',
  borderCard: 'border-gray-200',
  textPrimary: 'text-gray-900',
  textMuted: 'text-gray-500',
  primary: 'bg-blue-600',
  primaryHover: 'hover:bg-blue-700',
  primaryRing: 'focus:ring-blue-500',
  player1Fill: 'rgba(100,149,237,0.4)',
  player2Fill: 'rgba(255,160,122,0.5)',
  player1Stroke: 'rgba(70,120,200,0.6)',
  player2Stroke: 'rgba(220,130,100,0.6)',
  edgeFilled: '#374151',
  edgeAvailable: '#2563eb',
  edgeDisabled: '#d1d5db',
  dotFill: '#374151',
  dotStroke: '#1f2937',
} as const;

export const BOX_COLORS: Record<number, string> = {
  1: palette.player1Fill,
  2: palette.player2Fill,
};

export const BOX_STROKES: Record<number, string> = {
  1: palette.player1Stroke,
  2: palette.player2Stroke,
};

// Buttons
export const btnPrimary =
  'rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';

export const btnSecondary =
  'rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50';

export const btnGhost =
  'rounded-md px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50';

export const card = 'rounded-lg border border-gray-200 bg-white shadow-sm p-4';

// Board dimensions (for GameBoard responsive calc)
export const CELL_MIN = 36;
export const CELL_MAX = 96;
export const BOARD_PAD = 24;
export const CELL = 48; // fallback / initial
export const DOT_R = 4;

// Golden-mean layout: square viewport, min/max board size
export const MIN_BOARD_PX = 320;
export const MAX_BOARD_PX = 760;

export type BoardLayout = {
  boardPx: number;
  cell: number;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  /** Container size (for clamping SVG element so it doesn't overflow) */
  containerW: number;
  containerH: number;
};

function clampVal(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function calcBoardLayout(opts: {
  containerW: number;
  containerH: number;
  nx: number;
  ny: number;
  padding: number;
  minBoardPx: number;
  maxBoardPx: number;
}): BoardLayout {
  const limit = Math.min(opts.containerW, opts.containerH) - opts.padding * 2;
  const boardPx = clampVal(limit, opts.minBoardPx, opts.maxBoardPx);
  const grid = Math.max(opts.nx, opts.ny);
  const cell = Math.floor(boardPx / grid);
  const width = opts.nx * cell;
  const height = opts.ny * cell;
  const offsetX = Math.floor((boardPx - width) / 2);
  const offsetY = Math.floor((boardPx - height) / 2);
  return {
    boardPx,
    cell,
    width,
    height,
    offsetX,
    offsetY,
    containerW: opts.containerW,
    containerH: opts.containerH,
  };
}
