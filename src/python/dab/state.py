# dab/state.py — state and initial_state
from dataclasses import dataclass
from typing import FrozenSet

from dab.types import Edge


@dataclass(frozen=True)
class State:
    nx: int
    ny: int
    edges: FrozenSet[Edge]
    s1: int
    s2: int
    player: int  # 1 or 2


def initial_state(nx: int, ny: int) -> State:
    return State(nx=nx, ny=ny, edges=frozenset(), s1=0, s2=0, player=1)
