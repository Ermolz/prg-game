% yermolovych_dab_bot.pl
% Dots and Boxes: bot policy (greedy-safe move selection).

:- module(yermolovych_dab_bot, [
    bot_move_greedy_safe/3
]).

:- use_module(library(ordsets)).
:- use_module(yermolovych_dab_core, [
    possible_moves/2,
    apply_move/5,
    game_over/1,
    adjacent_box_for_edge/4,
    box_edges/3
]).
:- use_module(yermolovych_dab_utils, [normalize_edge/2]).

%% bot_move_greedy_safe(++State, -Move, -Reason) is det.
%  Chooses a move by policy: greedy_close > safe_no_third_side > fallback_min_risk. Tie-break: min edge (term order).
%  Modes: bot_move_greedy_safe(++, --, --).
bot_move_greedy_safe(State, Move, Reason) :-
    (   game_over(State)
    ->  throw(game_over)
    ;   possible_moves(State, Moves),
        (   Moves = []
        ->  throw(no_moves)
        ;   once(choose_by_policy(State, Moves, Move, Reason))
        )
    ).

%% choose_by_policy(++State, ++Moves, -Move, -Reason) is det.
%  Key (-Closed, Risk, Edge): max Closed, then min Risk, then min Edge. First after keysort wins.
%  Modes: choose_by_policy(++, ++, --, --).
choose_by_policy(State, Moves, Move, Reason) :-
    move_metrics_list(State, Moves, Pairs),
    keysort(Pairs, Sorted),
    Sorted = [(NegC, Risk, Move)-_|_],
    (   NegC =:= -2 -> Reason = greedy_close_2
    ;   NegC =:= -1 -> Reason = greedy_close_1
    ;   Risk =:= 0 -> Reason = safe_no_third_side
    ;   Reason = fallback_min_risk
    ).

move_metrics_list(_State, [], []).
move_metrics_list(State, [E|Es], [K-E|Rest]) :-
    move_metrics(State, E, Closed, Risk),
    NegC is -Closed,
    K = (NegC, Risk, E),
    move_metrics_list(State, Es, Rest).

%% move_metrics(++State, ++Edge, -ClosedCount, -RiskCount) is det.
%  ClosedCount = number of boxes closed by Edge (0, 1, or 2). RiskCount = third_side_risk after playing Edge.
%  Modes: move_metrics(++, ++, --, --).
move_metrics(State, Edge, ClosedCount, RiskCount) :-
    apply_move(State, Edge, _NewState, ClosedBoxes, _Extra),
    length(ClosedBoxes, ClosedCount),
    third_side_risk(State, Edge, RiskCount).

%% third_side_risk(++State, ++Edge, -Count) is det.
%  Count = number of adjacent boxes that would have exactly 3 sides after Edge is played (risk of giving opponent a box).
%  Modes: third_side_risk(++, ++, --).
third_side_risk(State, Edge, Count) :-
    State = state(NX, NY, Edges, _S1, _S2, _P),
    normalize_edge(Edge, Norm),
    ord_add_element(Edges, Norm, EdgesWith),
    findall(B, (adjacent_box_for_edge(NX, NY, Norm, B), three_sides(EdgesWith, B)), Boxes),
    length(Boxes, Count).

three_sides(Edges, box(X, Y)) :-
    box_edges(X, Y, BEdges),
    ord_intersection(Edges, BEdges, In),
    length(In, 3).
