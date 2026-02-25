# tests/python/test_dab.py — pytest tests for dab
import pytest
from dab.state import State, initial_state
from dab.core import (
    total_edges,
    possible_moves,
    apply_move,
    game_over,
    is_legal_move,
)
from dab.bot import greedy_safe_bot_move


def test_total_edges_2x2_12():
    assert total_edges(2, 2) == 12


def test_possible_moves_empty_2x2_12():
    s = initial_state(2, 2)
    assert len(possible_moves(s)) == 12


def test_repeat_edge_illegal():
    s = initial_state(2, 2)
    moves = possible_moves(s)
    e = moves[0]
    s1, _, _ = apply_move(s, e)
    assert not is_legal_move(s1, e)


def test_close_one_box_1x1_extra_turn():
    s = initial_state(1, 1)
    s, _, _ = apply_move(s, ((0, 0), (1, 0)))
    s, _, _ = apply_move(s, ((0, 0), (0, 1)))
    s, _, _ = apply_move(s, ((1, 0), (1, 1)))
    s, closed, extra = apply_move(s, ((0, 1), (1, 1)))
    assert closed == [(0, 0)]
    assert extra is True


def test_close_two_boxes_one_edge_2x1():
    s = initial_state(2, 1)
    for e in [
        ((0, 0), (1, 0)),
        ((0, 0), (0, 1)),
        ((0, 1), (1, 1)),
        ((1, 0), (2, 0)),
        ((1, 1), (2, 1)),
    ]:
        s, _, _ = apply_move(s, e)
    s, closed, extra = apply_move(s, ((1, 0), (1, 1)))
    assert len(closed) >= 1
    assert extra is True


def test_extra_turn_player_unchanged():
    s = initial_state(1, 1)
    for e in [((0, 0), (1, 0)), ((0, 0), (0, 1)), ((1, 0), (1, 1)), ((0, 1), (1, 1))]:
        s, _, _ = apply_move(s, e)
    assert s.player == 2  # player 2 closed the box → extra turn, same player


def test_no_close_player_changes():
    s = initial_state(2, 2)
    s, closed, extra = apply_move(s, ((0, 0), (1, 0)))
    assert closed == []
    assert extra is False
    assert s.player == 2


def test_game_over_all_edges():
    s = initial_state(1, 1)
    for e in [((0, 0), (1, 0)), ((0, 0), (0, 1)), ((1, 0), (1, 1)), ((0, 1), (1, 1))]:
        s, _, _ = apply_move(s, e)
    assert game_over(s) is True


def test_bot_deterministic_empty():
    s = initial_state(2, 2)
    m1, _ = greedy_safe_bot_move(s)
    m2, _ = greedy_safe_bot_move(s)
    assert m1 == m2


def test_bot_chooses_safe_when_available():
    s = initial_state(2, 2)
    _, reason = greedy_safe_bot_move(s)
    assert reason in (
        "greedy_close_1",
        "greedy_close_2",
        "safe_no_third_side",
        "fallback_min_risk",
    )
