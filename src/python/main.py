# Small demo runner for Dots and Boxes. Run from repo root: PYTHONPATH=src/python python src/python/main.py
from dab import initial_state, possible_moves, apply_move, greedy_safe_bot_move, game_over


def main() -> None:
    s = initial_state(2, 2)
    print("Initial 2x2:", len(possible_moves(s)), "moves")
    move, reason = greedy_safe_bot_move(s)
    print("Bot move:", move, "reason:", reason)
    s1, closed, extra = apply_move(s, move)
    print("After move: closed", closed, "extra", extra)


if __name__ == "__main__":
    main()
