# Dots and Boxes — public API
from dab.state import State, initial_state
from dab.util import normalize_edge
from dab.core import (
    is_valid_edge,
    is_legal_move,
    apply_move,
    possible_moves,
)
from dab.bot import greedy_safe_bot_move

__all__ = [
    "State",
    "initial_state",
    "normalize_edge",
    "is_valid_edge",
    "is_legal_move",
    "apply_move",
    "possible_moves",
    "greedy_safe_bot_move",
]
