# dab/util.py — shared helpers (no dependency on core/geometry)
from dab.types import Edge


def normalize_edge(edge: Edge) -> Edge:
    """Canonical order: smaller point first (by x then y)."""
    (a, b) = edge
    return (a, b) if a <= b else (b, a)
