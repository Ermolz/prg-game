% Yermolovych Zakhar Maksymovych
% yermolovych_dab_metrics.pl
% Спільні метрики ходу для жадібної політики та впорядкування ходів у MiniMax.

:- module(yermolovych_dab_metrics, [
    move_metrics/4,
    third_side_risk/3
]).

:- use_module(library(ordsets)).

:- use_module(yermolovych_dab_core, [
    apply_move/5,
    adjacent_box_for_edge/4,
    box_edges/3
]).

:- use_module(yermolovych_dab_utils, [
    normalize_edge/2
]).

% ============================================================
% move_metrics/4
% ============================================================

% move_metrics(++State, ++Edge, --ClosedCount, --RiskCount) is det.
%
% Призначення:
%   Для гіпотетичного ходу Edge (без зміни зовнішнього State у викликача)
%   обчислює:
%     ClosedCount — кількість клітинок, замкнених цим ходом (через apply_move/5);
%     RiskCount   — кількість клітинок, у яких після ходу лишається рівно три сторони
%                   (third_side_risk/3), тобто «ризик» для суперника.
%
% Мультипризначенність:
%   1) move_metrics(++State, ++Edge, --ClosedCount, --RiskCount)
%      Єдине змістовне призначення:
%      отримати дві метрики для конкретного стану й конкретного ребра.
%
%   Інші змістовні призначення відсутні:
%   - предикат не генерує Edge чи State;
%   - не призначений для зворотного відновлення State за числами.
move_metrics(State, Edge, ClosedCount, RiskCount) :-
    apply_move(State, Edge, _NewState, ClosedBoxes, _Extra),
    length(ClosedBoxes, ClosedCount),
    third_side_risk(State, Edge, RiskCount).

% ============================================================
% third_side_risk/3
% ============================================================

% third_side_risk(++State, ++Edge, --Count) is det.
%
% Призначення:
%   Після додавання Edge до множини ребер у State підраховує клітинки,
%   у яких рівно три вже проведені сторони (небезпечна позиція для суперника).
%
% Мультипризначенність:
%   1) third_side_risk(++State, ++Edge, --Count)
%      Єдине змістовне призначення:
%      одне невід’ємне ціле Count для заданих State і Edge.
%
%   Інші змістовні призначення відсутні.
third_side_risk(State, Edge, Count) :-
    State = state(NX, NY, Edges, _S1, _S2, _P),
    normalize_edge(Edge, Norm),
    ord_add_element(Edges, Norm, EdgesWith),
    findall(
        B,
        (   adjacent_box_for_edge(NX, NY, Norm, B),
            three_sides(EdgesWith, B)
        ),
        Boxes
    ),
    length(Boxes, Count).

% ============================================================
% three_sides/2  (внутрішній)
% ============================================================

% three_sides(++Edges, ++Box) is semidet.
%
% Призначення:
%   Істинний, якщо серед чотирьох ребер клітинки Box рівно три містяться в Edges.
%
% Мультипризначенність:
%   1) three_sides(++Edges, ++Box)
%      Єдине змістовне призначення:
%      перевірка для конкретної клітинки та множини ребер.
%
%   Інші змістовні призначення відсутні:
%   - предикат не генерує клітинки за Edges як загальний генератор.
three_sides(Edges, box(X, Y)) :-
    box_edges(X, Y, BEdges),
    ord_intersection(Edges, BEdges, In),
    length(In, 3).
