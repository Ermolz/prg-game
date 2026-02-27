# dab/geometry.py — box edges and completed boxes (0..2 adjacent)
from typing import List

from dab.types import Edge, Box
from dab.state import State
from dab.util import normalize_edge


def box_edges(x: int, y: int) -> List[Edge]:
    """Four edges of box with top-left (x, y)."""
    p00 = (x, y)
    p10 = (x + 1, y)
    p01 = (x, y + 1)
    p11 = (x + 1, y + 1)
    return [
        normalize_edge((p00, p10)),
        normalize_edge((p00, p01)),
        normalize_edge((p10, p11)),
        normalize_edge((p01, p11)),
    ]


def adjacent_boxes_for_edge(nx: int, ny: int, edge: Edge) -> List[Box]:
    """At most 2 boxes (top-left) adjacent to edge."""
    (ax, ay), (bx, by) = edge
    min_x, min_y = min(ax, bx), min(ay, by)
    out: List[Box] = []
    if ay == by:
        for yy in (min_y, min_y - 1):
            if 0 <= yy < ny and 0 <= min_x < nx:
                out.append((min_x, yy))
    else:
        for xx in (min_x, min_x - 1):
            if 0 <= xx < nx and 0 <= min_y < ny:
                out.append((xx, min_y))
    return out


def completed_boxes_by_edge(state: State, edge: Edge) -> List[Box]:
    """Boxes closed by adding edge (0, 1, or 2). Only checks 0..2 adjacent boxes."""
    edges_with = state.edges | {edge}
    closed: List[Box] = []
    for box in adjacent_boxes_for_edge(state.nx, state.ny, edge):
        if all(e in edges_with for e in box_edges(box[0], box[1])):
            closed.append(box)
    return closed
