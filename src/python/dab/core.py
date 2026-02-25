# dab/core.py — game rules
from typing import List, Tuple

from dab.types import Edge, Point
from dab.state import State
from dab.util import normalize_edge
from dab.geometry import completed_boxes_by_edge


def _manhattan_one(p1: Point, p2: Point) -> bool:
    return abs(p1[0] - p2[0]) + abs(p1[1] - p2[1]) == 1


def is_valid_edge(nx: int, ny: int, edge: Edge) -> bool:
    """Both points (dots) in bounds: 0<=x<=nx, 0<=y<=ny, and Manhattan distance 1."""
    (a, b) = edge
    for x, y in (a, b):
        if not (0 <= x <= nx and 0 <= y <= ny):
            return False
    return _manhattan_one(a, b)


def is_legal_move(state: State, move: Edge) -> bool:
    """Move not in edges and valid."""
    norm = normalize_edge(move)
    return norm not in state.edges and is_valid_edge(state.nx, state.ny, norm)


def apply_move(
    state: State, move: Edge
) -> Tuple[State, List[Tuple[int, int]], bool]:
    """Returns (new_state, closed_boxes, extra_turn)."""
    norm = normalize_edge(move)
    if norm in state.edges:
        raise ValueError("illegal move: edge already present")
    if not is_valid_edge(state.nx, state.ny, norm):
        raise ValueError("illegal move: invalid edge")
    edges_new = state.edges | {norm}
    closed = completed_boxes_by_edge(
        State(state.nx, state.ny, edges_new, state.s1, state.s2, state.player),
        norm,
    )
    n = len(closed)
    if n == 0:
        next_player = 2 if state.player == 1 else 1
        return (
            State(state.nx, state.ny, edges_new, state.s1, state.s2, next_player),
            [],
            False,
        )
    if state.player == 1:
        return (
            State(state.nx, state.ny, edges_new, state.s1 + n, state.s2, state.player),
            closed,
            True,
        )
    return (
        State(state.nx, state.ny, edges_new, state.s1, state.s2 + n, state.player),
        closed,
        True,
    )


def possible_moves(state: State) -> List[Edge]:
    """All legal moves, sorted for determinism."""
    out: List[Edge] = []
    nx, ny = state.nx, state.ny
    for x in range(nx):
        for y in range(ny + 1):
            e = normalize_edge(((x, y), (x + 1, y)))
            if e not in state.edges:
                out.append(e)
    for x in range(nx + 1):
        for y in range(ny):
            e = normalize_edge(((x, y), (x, y + 1)))
            if e not in state.edges:
                out.append(e)
    return sorted(set(out))


def total_edges(nx: int, ny: int) -> int:
    return nx * (ny + 1) + (nx + 1) * ny


def game_over(state: State) -> bool:
    return len(state.edges) == total_edges(state.nx, state.ny)
