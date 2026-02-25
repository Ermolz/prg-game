# dab/types.py — type aliases and reason literals
from typing import Literal, Tuple

# (x, y) grid point
Point = Tuple[int, int]

# Edge as (p1, p2) with p1 <= p2 (canonical)
Edge = Tuple[Point, Point]

# Box top-left (x, y)
Box = Tuple[int, int]

Reason = Literal[
    "greedy_close_1",
    "greedy_close_2",
    "safe_no_third_side",
    "fallback_min_risk",
]
