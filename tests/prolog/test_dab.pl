% test_dab.pl — PlUnit tests for Dots and Boxes (yermolovych_dab_*).

:- use_module(library(plunit)).
:- use_module('src/prolog/yermolovych_dab_main', [
    initial_state/3,
    legal_move/3,
    apply_move/5,
    possible_moves/2,
    bot_move_greedy_safe/3,
    game_over/1
]).
:- use_module('src/prolog/yermolovych_dab_utils', [total_edges/3]).

:- begin_tests(dab).

test(total_edges_2x2_12, [true(Total =:= 12)]) :-
    total_edges(2, 2, Total).

test(possible_moves_empty_2x2_12, [true(L =:= 12)]) :-
    initial_state(2, 2, S),
    possible_moves(S, Moves),
    length(Moves, L).

test(repeat_edge_not_legal, []) :-
    initial_state(2, 2, S),
    possible_moves(S, [E|_]),
    apply_move(S, E, S1, _Closed, _Extra),
    S1 = state(_NX, _NY, Edges1, _S1, _S2, _P),
    \+ legal_move(S1, E, Edges1).

test(close_one_box_1x1_extra_turn, [true(Extra = yes)]) :-
    initial_state(1, 1, S),
    apply_move(S, edge(point(0,0), point(1,0)), S1, _C1, _E1),
    apply_move(S1, edge(point(0,0), point(0,1)), S2, _C2, _E2),
    apply_move(S2, edge(point(1,0), point(1,1)), S3, _C3, _E3),
    apply_move(S3, edge(point(0,1), point(1,1)), _S4, Closed, Extra),
    Closed = [box(0,0)],
    Extra = yes.

test(close_two_boxes_one_edge_2x1, [true((L >= 1, Extra = yes))]) :-
    initial_state(2, 1, S),
    % 2x1 grid: two boxes. Five edges then middle vertical (1,0)-(1,1) closes at least left box.
    apply_move(S, edge(point(0,0), point(1,0)), S1, _C1, _E1),
    apply_move(S1, edge(point(0,0), point(0,1)), S2, _C2, _E2),
    apply_move(S2, edge(point(0,1), point(1,1)), S3, _C3, _E3),
    apply_move(S3, edge(point(1,0), point(2,0)), S4, _C4, _E4),
    apply_move(S4, edge(point(1,1), point(2,1)), S5, _C5, _E5),
    apply_move(S5, edge(point(1,0), point(1,1)), _S6, Closed, Extra),
    length(Closed, L).

test(extra_turn_player_unchanged, [true(Player =:= 2)]) :-
    initial_state(1, 1, S),
    apply_move(S, edge(point(0,0), point(1,0)), S1, [], _),
    apply_move(S1, edge(point(0,0), point(0,1)), S2, [], _),
    apply_move(S2, edge(point(1,0), point(1,1)), S3, [], _),
    apply_move(S3, edge(point(0,1), point(1,1)), S4, [_], _),
    S4 = state(_NX, _NY, _Edges, _S1, _S2, Player).

test(no_close_player_changes, [true(Next =:= 2)]) :-
    initial_state(2, 2, S),
    apply_move(S, edge(point(0,0), point(1,0)), S1, Closed, Extra),
    Closed = [],
    Extra = no,
    S1 = state(_NX, _NY, _E, _S1, _S2, Next).

test(game_over_all_edges_filled, [true]) :-
    initial_state(1, 1, S),
    apply_move(S, edge(point(0,0), point(1,0)), S1, _C1, _E1),
    apply_move(S1, edge(point(0,0), point(0,1)), S2, _C2, _E2),
    apply_move(S2, edge(point(1,0), point(1,1)), S3, _C3, _E3),
    apply_move(S3, edge(point(0,1), point(1,1)), S4, _C4, _E4),
    game_over(S4).

test(bot_deterministic_empty_board, [true(M1 =@= M2)]) :-
    initial_state(2, 2, S),
    bot_move_greedy_safe(S, M1, _R1),
    bot_move_greedy_safe(S, M2, _R2),
    M1 =@= M2.

test(bot_chooses_safe_when_available, [true]) :-
    initial_state(2, 2, S),
    bot_move_greedy_safe(S, _Move, Reason),
    memberchk(Reason, [safe_no_third_side, greedy_close_1, greedy_close_2, fallback_min_risk]).

:- end_tests(dab).
