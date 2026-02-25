% yermolovych_dab_main.pl
% Dots and Boxes: single entry point and public API.

:- module(yermolovych_dab_main, [
    initial_state/3,
    legal_move/3,
    apply_move/5,
    possible_moves/2,
    bot_move_greedy_safe/3,
    game_over/1
]).

:- use_module(yermolovych_dab_core, [
    initial_state/3,
    legal_move/3,
    apply_move/5,
    possible_moves/2,
    game_over/1
]).
:- use_module(yermolovych_dab_bot, [bot_move_greedy_safe/3]).
:- use_module(yermolovych_dab_utils, [total_edges/3]).
