# dab/bot.py — greedy-safe move selection
from typing import List, Tuple

from dab.types import Edge, Reason
from dab.state import State
from dab.core import apply_move, possible_moves, game_over
from dab.geometry import adjacent_boxes_for_edge, box_edges


def third_side_risk(state: State, edge: Edge) -> int:
    """Number of adjacent boxes that would have exactly 3 sides after playing edge."""
    edges_with = state.edges | {edge}
    count = 0
    for box in adjacent_boxes_for_edge(state.nx, state.ny, edge):
        be = box_edges(box[0], box[1])
        if sum(1 for e in be if e in edges_with) == 3:
            count += 1
    return count


def greedy_safe_bot_move(state: State) -> Tuple[Edge, Reason]:
    """Best move by policy: greedy_close > safe_no_third_side > fallback_min_risk. Tie: min edge."""
    if game_over(state):
        raise ValueError("game over")
    moves = possible_moves(state)
    if not moves:
        raise ValueError("no moves")
    candidates: List[Tuple[int, int, Edge]] = []
    for e in moves:
        _, closed, _ = apply_move(state, e)
        closed_count = len(closed)
        risk = third_side_risk(state, e)
        candidates.append((-closed_count, risk, e))
    candidates.sort(key=lambda t: (t[0], t[1], t[2]))
    neg_closed, risk, best_move = candidates[0]
    if neg_closed <= -2:
        best_reason: Reason = "greedy_close_2"
    elif neg_closed == -1:
        best_reason = "greedy_close_1"
    elif risk == 0:
        best_reason = "safe_no_third_side"
    else:
        best_reason = "fallback_min_risk"
    return best_move, best_reason
