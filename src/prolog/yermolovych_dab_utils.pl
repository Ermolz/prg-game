% yermolovych_dab_utils.pl
% Dots and Boxes: utility predicates (bounds, edges, players, winner).
% Used by core and bot.

:- module(yermolovych_dab_utils, [
    point_in_bounds/3,
    adjacent_points/2,
    normalize_edge/2,
    total_edges/3,
    other_player/2,
    winner/3
]).

%% point_in_bounds(++Point, ++NX, ++NY) is semidet.
%  Point is point(X,Y) (a grid dot). Succeeds iff 0 =< X =< NX and 0 =< Y =< NY.
%  Modes: point_in_bounds(++, ++, ++).
point_in_bounds(point(X, Y), NX, NY) :-
    X >= 0,
    X =< NX,
    Y >= 0,
    Y =< NY.

%% adjacent_points(++Point, --Adj) is multi.
%  Adj is point(Ax,Ay) such that Manhattan distance from Point is 1 (grid neighbour).
%  Modes: adjacent_points(++, --).
adjacent_points(point(X, Y), point(Ax, Ay)) :-
    (   Ax is X - 1, Ay = Y
    ;   Ax is X + 1, Ay = Y
    ;   Ax = X, Ay is Y - 1
    ;   Ax = X, Ay is Y + 1
    ).

%% normalize_edge(++EdgeIn, -EdgeOut) is det.
%  EdgeIn is edge(P1,P2). EdgeOut is edge(A,B) with A @=< B (standard order: X then Y).
%  Modes: normalize_edge(++, --).
normalize_edge(edge(P1, P2), edge(A, B)) :-
    (   P1 @=< P2 -> A = P1, B = P2
    ;   A = P2, B = P1
    ).

%% total_edges(++NX, ++NY, -Total) is det.
%  Total number of edges on NX x NY grid: NX*(NY+1) + (NX+1)*NY.
%  Modes: total_edges(++, ++, --).
total_edges(NX, NY, Total) :-
    Total is NX * (NY + 1) + (NX + 1) * NY.

%% other_player(++Player, -Other) is det.
%  Player is 1 or 2. Other is the opposite. Modes: other_player(++, --).
other_player(1, 2).
other_player(2, 1).

%% winner(++S1, ++S2, -W) is det.
%  W = 1 if S1 > S2, 2 if S2 > S1, 0 if draw. Modes: winner(++, ++, --).
winner(S1, S2, 1) :- S1 > S2.
winner(S1, S2, 2) :- S2 > S1.
winner(S1, S2, 0) :- S1 =:= S2.
