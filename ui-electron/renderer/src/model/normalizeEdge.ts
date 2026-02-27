import type { Edge, Point } from './types';

/** Compare points: first by x, then by y. Returns edge with a <= b. */
export function normalizeEdge(edge: Edge): Edge {
  const { a, b } = edge;
  if (a.x < b.x) return { a, b };
  if (a.x > b.x) return { a: b, b: a };
  if (a.y <= b.y) return { a, b };
  return { a: b, b: a };
}

export function edgeKey(e: Edge): string {
  const n = normalizeEdge(e);
  return `${n.a.x},${n.a.y}-${n.b.x},${n.b.y}`;
}

export function edgesEqual(e1: Edge, e2: Edge): boolean {
  const n1 = normalizeEdge(e1);
  const n2 = normalizeEdge(e2);
  return n1.a.x === n2.a.x && n1.a.y === n2.a.y && n1.b.x === n2.b.x && n1.b.y === n2.b.y;
}
