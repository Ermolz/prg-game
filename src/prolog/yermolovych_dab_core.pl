% yermolovych_dab_core.pl
% Dots and Boxes: core game logic (state, moves, apply, game over).
% Edges kept as ordset; no CLP(FD): grid size small, arithmetic sufficient.

:- module(yermolovych_dab_core, [
    initial_state/3,
    valid_edge/4,
    legal_move/3,
    apply_move/5,
    completed_boxes_by_edge/3,
    possible_moves/2,
    game_over/1,
    adjacent_box_for_edge/4,
    box_edges/3,
    box_closed/2
]).

:- use_module(library(ordsets)).
:- use_module(yermolovych_dab_utils, [
    point_in_bounds/3,
    normalize_edge/2,
    total_edges/3,
    other_player/2
]).

%% initial_state(++NX, ++NY, -State) is det.
%  State = state(NX,NY,Edges,S1,S2,Player) with empty Edges, scores 0, Player 1.
%  Modes: initial_state(++, ++, --).
initial_state(NX, NY, state(NX, NY, [], 0, 0, 1)).

%% valid_edge(++NX, ++NY, ++Edge, ++Edges) is semidet.
%  Edge is a valid grid edge (both points in bounds, Manhattan 1); not in Edges.
%  Modes: valid_edge(++, ++, ++, ++). (Edges for redundancy check; legal_move uses it.)
valid_edge(NX, NY, edge(P1, P2), Edges) :-
    point_in_bounds(P1, NX, NY),
    point_in_bounds(P2, NX, NY),
    manhattan_one(P1, P2),
    normalize_edge(edge(P1, P2), Norm),
    \+ ord_memberchk(Norm, Edges).

manhattan_one(point(X1, Y1), point(X2, Y2)) :-
    Dx is abs(X1 - X2),
    Dy is abs(Y1 - Y2),
    Dx + Dy =:= 1.

%% legal_move(++State, ++Move, ++Edges) is semidet.
%  Move is edge(P,Q); normalized Move not in State's Edges and valid.
%  Modes: legal_move(++, ++, ++). (Third arg is State's edges for clarity in tests.)
legal_move(state(NX, NY, Edges, _S1, _S2, _P), Move, Edges) :-
    normalize_edge(Move, Norm),
    \+ ord_memberchk(Norm, Edges),
    valid_edge_geometry(NX, NY, Norm).

valid_edge_geometry(NX, NY, edge(P1, P2)) :-
    point_in_bounds(P1, NX, NY),
    point_in_bounds(P2, NX, NY),
    manhattan_one(P1, P2).

%% apply_move(++State, ++Move, -NewState, -ClosedBoxes, -ExtraTurn) is det.
%  NewState has Move added to Edges; ClosedBoxes = list of box(X,Y) closed; ExtraTurn = true if any closed.
%  Modes: apply_move(++, ++, --, --, --).
apply_move(state(NX, NY, Edges, S1, S2, Player), Move, NewState, ClosedBoxes, ExtraTurn) :-
    normalize_edge(Move, Norm),
    ord_add_element(Edges, Norm, Edges1),
    completed_boxes_by_edge(state(NX, NY, Edges1, _S1, _S2, _P), Norm, ClosedBoxes),
    length(ClosedBoxes, N),
    (   N =:= 0
    ->  other_player(Player, Next),
        NewState = state(NX, NY, Edges1, S1, S2, Next),
        ExtraTurn = no
    ;   add_scores(Player, N, S1, S2, NS1, NS2),
        NewState = state(NX, NY, Edges1, NS1, NS2, Player),
        ExtraTurn = yes
    ).

add_scores(1, N, S1, S2, NS1, NS2) :- NS1 is S1 + N, NS2 = S2.
add_scores(2, N, S1, S2, NS1, NS2) :- NS2 is S2 + N, NS1 = S1.

%% completed_boxes_by_edge(++State, ++Edge, -Boxes) is det.
%  Boxes = list of box(X,Y) closed by adding Edge (0, 1, or 2 boxes). Incremental: only 0..2 adjacent boxes checked.
%  Modes: completed_boxes_by_edge(++, ++, --).
completed_boxes_by_edge(State, Edge, Boxes) :-
    State = state(NX, NY, Edges, _S1, _S2, _P),
    ord_add_element(Edges, Edge, EdgesWith),
    findall(B, (adjacent_box_for_edge(NX, NY, Edge, B), box_closed(EdgesWith, B)), Boxes).

%% adjacent_box_for_edge(++NX, ++NY, ++Edge, -Box) is multi.
%  Box = box(X,Y) top-left of grid box adjacent to Edge (0, 1 or 2 boxes). Horizontal edge: boxes (minX, minY-1), (minX, minY). Vertical: (minX-1, minY), (minX, minY).
%  Modes: adjacent_box_for_edge(++, ++, ++, --).
adjacent_box_for_edge(NX, NY, edge(point(Ax, Ay), point(Bx, By)), box(X, Y)) :-
    MinX is min(Ax, Bx),
    MinY is min(Ay, By),
    (   Ay =:= By
    ->  (   Y = MinY ; Y is MinY - 1 ),
        X = MinX,
        Y >= 0, Y < NY,
        X >= 0, X < NX
    ;   Ax =:= Bx
    ->  (   X = MinX ; X is MinX - 1 ),
        Y = MinY,
        X >= 0, X < NX,
        Y >= 0, Y < NY
    ).

%% box_edges(++X, ++Y, -EdgeList) is det.
%  EdgeList = ordset (sorted) of 4 normalized edges of box(X,Y).
box_edges(X, Y, BEdgesOrd) :-
    X1 is X + 1,
    Y1 is Y + 1,
    P00 = point(X,  Y),
    P10 = point(X1, Y),
    P01 = point(X,  Y1),
    P11 = point(X1, Y1),
    normalize_edge(edge(P00, P10), E1),
    normalize_edge(edge(P00, P01), E2),
    normalize_edge(edge(P10, P11), E3),
    normalize_edge(edge(P01, P11), E4),
    sort([E1,E2,E3,E4], BEdgesOrd).

%% box_closed(++Edges, ++Box) is semidet.
%  All four edges of Box are in Edges. Modes: box_closed(++, ++).
box_closed(Edges, box(X, Y)) :-
    box_edges(X, Y, BEdgesOrd),
    ord_subset(BEdgesOrd, Edges).

%% possible_moves(++State, -Moves) is det.
%  Moves = list of all legal (normalized) edges not yet in State. Sorted for determinism.
%  Modes: possible_moves(++, --).
possible_moves(State, Moves) :-
    State = state(NX, NY, Edges, _S1, _S2, _P),
    total_edges(NX, NY, _),
    findall(E, (grid_edge(NX, NY, E), \+ ord_memberchk(E, Edges)), Raw),
    sort(Raw, Moves).

grid_edge(NX, NY, E) :-
    NX0 is NX - 1,
    NY0 is NY - 1,
    (   between(0, NX0, X), between(0, NY, Y),
        X1 is X + 1,
        P1 = point(X, Y), P2 = point(X1, Y),
        normalize_edge(edge(P1, P2), E)
    ;   between(0, NX, X), between(0, NY0, Y),
        Y1 is Y + 1,
        P1 = point(X, Y), P2 = point(X, Y1),
        normalize_edge(edge(P1, P2), E)
    ).

%% game_over(++State) is semidet.
%  All edges are filled. Modes: game_over(++).
game_over(state(NX, NY, Edges, _S1, _S2, _P)) :-
    total_edges(NX, NY, Total),
    length(Edges, Total).

/** <examples>
% 2x2 grid: total 12 edges
% ?- initial_state(2,2,S), possible_moves(S,M), length(M,L).  % L=12
% Close 1 box on 1x1: 4 edges close the single box, extra turn
% ?- initial_state(1,1,S), apply_move(S, edge(point(0,0),point(1,0)), S1, B, E).  % B=[], E=no (need 3 more)
% game_over when all edges present
*/
