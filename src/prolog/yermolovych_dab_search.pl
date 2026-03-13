% Yermolovych Zakhar Maksymovych
% yermolovych_dab_search.pl
% MiniMax з опційним α–β відсіченням для Dots and Boxes.
% 1 півхід = одне проведене ребро; extra turn кодується в дочірньому стані після apply_move/5.

:- module(yermolovych_dab_search, [
    minimax_decide/7,
    ordered_moves/2,
    terminal_value/3,
    static_eval/3,
    depth1_ref_best_move/2
]).

:- use_module(yermolovych_dab_core, [
    apply_move/5,
    game_over/1,
    possible_moves/2
]).

:- use_module(yermolovych_dab_metrics, [
    move_metrics/4
]).

% Евристичні ваги для static_eval/3 (закриття / ризик).
eval_weight_closing_move(3).
eval_weight_risk_sum(1).
eval_neg_inf(-1000000).
eval_pos_inf(1000000).

% ============================================================
% minimax_decide/7
% ============================================================

% minimax_decide(++State, ++Depth, ++UseAB, --BestMove, --Nodes, --Cutoffs, --DepthUsed) is det.
%
% Призначення:
%   Кореневий вибір ходу з ordered_moves/2; Depth — ліміт півходів (ребро = 1 півхід).
%   UseAB = true — відсічення α–β; false — повний перебір на межі глибини.
%   Nodes / Cutoffs — лічильники nb_setval/nb_getval у межах одного виклику.
%   DepthUsed — максимум (K_req − Rem) по дереву при вході в minimax_value/7.
%
% Мультипризначенність:
%   1) minimax_decide(++State, ++Depth, ++UseAB, --BestMove, --Nodes, --Cutoffs, --DepthUsed)
%      Єдине змістовне призначення для нетермінального стану з ходами та Depth ≥ 1.
%
%   Інші змістовні призначення відсутні.
minimax_decide(State, Depth, UseAB, BestMove, Nodes, Cutoffs, DepthUsed) :-
    State = state(_, _, _, _, _, RootPlayer),
    nb_setval(dab_search_nodes, 0),
    nb_setval(dab_search_cutoffs, 0),
    nb_setval(dab_depth_requested, Depth),
    nb_setval(dab_max_depth_used, 0),
    ordered_moves(State, Moves),
    eval_neg_inf(NegInf),
    eval_pos_inf(PosInf),
    root_pick(Moves, State, RootPlayer, Depth, NegInf, PosInf, UseAB, BestMove),
    nb_getval(dab_search_nodes, Nodes),
    nb_getval(dab_search_cutoffs, Cutoffs),
    nb_getval(dab_max_depth_used, DepthUsed).

% dab_update_depth_used(++Rem) is det.
% Внутрішній: оновлює глобальний максимум використаної глибини за K − Rem.
dab_update_depth_used(Rem) :-
    nb_getval(dab_depth_requested, K),
    nb_getval(dab_max_depth_used, M0),
    U is K - Rem,
    M1 is max(M0, U),
    nb_setval(dab_max_depth_used, M1).

% root_pick(++Moves, ++State, ++RootPlayer, ++Depth, ++Alpha, ++Beta, ++UseAB, --Best) is det.
%
% Обхід кореня: для кожного ходу — minimax_value у дочірньому стані; tie-break за @< на ребрі.
% Між кореневими сусідами оновлюються α/β (як у внутрішніх max/min циклах), щоб відсічення
% α–β діяли на кореневому рівні: після кожного оціненого ходу max-гравця α := max(α, v);
% після ходу min-гравця β := min(β, v) — наступний дочірній піддерево отримує вже звужений інтервал.
root_pick([M|Ms], State, RP, Depth, Alpha, Beta, UseAB, Best) :-
    State = state(_, _, _, _, _, CurP),
    apply_move(State, M, Child, _, _),
    D1 is Depth - 1,
    minimax_value(Child, RP, D1, Alpha, Beta, UseAB, V),
    (   CurP =:= RP
    ->  Alpha1 is max(Alpha, V),
        root_pick_max_rest(Ms, State, RP, Depth, Alpha1, Beta, UseAB, M, V, Best)
    ;   Beta1 is min(Beta, V),
        root_pick_min_rest(Ms, State, RP, Depth, Alpha, Beta1, UseAB, M, V, Best)
    ).

root_pick_max_rest([], _, _, _, _, _, _, CurM, _, CurM).

root_pick_max_rest([M|Ms], State, RP, Depth, Alpha, Beta, UseAB, CurM, CurV, Best) :-
    apply_move(State, M, Child, _, _),
    D1 is Depth - 1,
    minimax_value(Child, RP, D1, Alpha, Beta, UseAB, V),
    (   V > CurV
    ->  M1 = M,
        V1 = V
    ;   V =:= CurV,
        M @< CurM
    ->  M1 = M,
        V1 = V
    ;   M1 = CurM,
        V1 = CurV
    ),
    Alpha1 is max(Alpha, V),
    root_pick_max_rest(Ms, State, RP, Depth, Alpha1, Beta, UseAB, M1, V1, Best).

root_pick_min_rest([], _, _, _, _, _, _, CurM, _, CurM).

root_pick_min_rest([M|Ms], State, RP, Depth, Alpha, Beta, UseAB, CurM, CurV, Best) :-
    apply_move(State, M, Child, _, _),
    D1 is Depth - 1,
    minimax_value(Child, RP, D1, Alpha, Beta, UseAB, V),
    (   V < CurV
    ->  M1 = M,
        V1 = V
    ;   V =:= CurV,
        M @< CurM
    ->  M1 = M,
        V1 = V
    ;   M1 = CurM,
        V1 = CurV
    ),
    Beta1 is min(Beta, V),
    root_pick_min_rest(Ms, State, RP, Depth, Alpha, Beta1, UseAB, M1, V1, Best).

% ============================================================
% minimax_value/7
% ============================================================

% minimax_value(++State, ++RootPlayer, ++Depth, ++Alpha, ++Beta, ++UseAB, --Value) is det.
%
% Призначення:
%   Оцінка позиції з точки зору гравця кореня RootPlayer:
%   термінал → terminal_value/3; глибина 0 → static_eval/3;
%   інакше max або min залежно від поточного гравця в State (extra turn уже в Child).
%
% Мультипризначенність:
%   1) minimax_value(++State, ++RootPlayer, ++Depth, ++Alpha, ++Beta, ++UseAB, --Value)
%      Єдине змістовне призначення при фіксованих лічильниках і порядку ходів.
%
%   Інші змістовні призначення відсутні.
minimax_value(State, RP, Depth, Alpha, Beta, UseAB, Value) :-
    dab_update_depth_used(Depth),
    nb_getval(dab_search_nodes, N0),
    N1 is N0 + 1,
    nb_setval(dab_search_nodes, N1),
    (   game_over(State)
    ->  terminal_value(State, RP, Value)
    ;   Depth =:= 0
    ->  static_eval(State, RP, Value)
    ;   ordered_moves(State, Moves),
        State = state(_, _, _, _, _, CurP),
        (   CurP =:= RP
        ->  eval_neg_inf(NegInf),
            max_value_loop(Moves, State, RP, Depth, Alpha, Beta, UseAB, NegInf, Value)
        ;   eval_pos_inf(PosInf),
            min_value_loop(Moves, State, RP, Depth, Alpha, Beta, UseAB, PosInf, Value)
        )
    ).

% max_value_loop / min_value_loop — внутрішні цикли з опційним α–β (див. UseAB та порівняння з Beta/Alpha).

max_value_loop([], _, _, _, _, _, _, Best, Best).

max_value_loop([M|Ms], State, RP, Depth, Alpha, Beta, UseAB, Best0, Value) :-
    apply_move(State, M, Child, _, _),
    D1 is Depth - 1,
    minimax_value(Child, RP, D1, Alpha, Beta, UseAB, V0),
    Best1 is max(Best0, V0),
    NewAlpha is max(Alpha, V0),
    (   UseAB = true,
        Beta =< NewAlpha,
        Ms \= []
    ->  dab_incr_cutoff,
        Value = Best1
    ;   Ms = []
    ->  Value = Best1
    ;   max_value_loop(Ms, State, RP, Depth, NewAlpha, Beta, UseAB, Best1, Value)
    ).

min_value_loop([], _, _, _, _, _, _, Best, Best).

min_value_loop([M|Ms], State, RP, Depth, Alpha, Beta, UseAB, Best0, Value) :-
    apply_move(State, M, Child, _, _),
    D1 is Depth - 1,
    minimax_value(Child, RP, D1, Alpha, Beta, UseAB, V0),
    Best1 is min(Best0, V0),
    NewBeta is min(Beta, V0),
    (   UseAB = true,
        NewBeta =< Alpha,
        Ms \= []
    ->  dab_incr_cutoff,
        Value = Best1
    ;   Ms = []
    ->  Value = Best1
    ;   min_value_loop(Ms, State, RP, Depth, Alpha, NewBeta, UseAB, Best1, Value)
    ).

% dab_incr_cutoff/0 is det. Внутрішній лічильник відсічень α–β.
dab_incr_cutoff :-
    nb_getval(dab_search_cutoffs, C0),
    C1 is C0 + 1,
    nb_setval(dab_search_cutoffs, C1).

% ============================================================
% terminal_value/3
% ============================================================

% terminal_value(++State, ++RootPlayer, --Value) is det.
%
% Призначення:
%   Фінальна різниця очок з точки зору RootPlayer (S1−S2 або S2−S1) при game_over(State).
%
% Мультипризначенність:
%   1) terminal_value(++State, ++RootPlayer, --Value)
%      Єдине змістовне призначення для завершеної гри.
%
%   Інші змістовні призначення відсутні.
terminal_value(State, RP, V) :-
    State = state(_, _, _, S1, S2, _),
    perspective_score(S1, S2, RP, V).

% perspective_score(++S1, ++S2, ++RP, --V) is det. Внутрішній допоміжний для terminal/static.
perspective_score(S1, S2, 1, V) :-
    V is S1 - S2.
perspective_score(S1, S2, 2, V) :-
    V is S2 - S1.

% ============================================================
% static_eval/3
% ============================================================

% static_eval(++State, ++RootPlayer, --Value) is det.
%
% Призначення:
%   Евристика на листі: V = Base + Bonus − Penalty.
%   Base — perspective_score(S1, S2, RP, Base) (4 аргументи); Bonus — вага × кількість ходів із Closed ≥ 1;
%   Penalty — вага × сума Risk по всіх легальних ходах (move_metrics/4).
%
% Мультипризначенність:
%   1) static_eval(++State, ++RootPlayer, --Value)
%      Єдине змістовне призначення.
%
%   Інші змістовні призначення відсутні.
static_eval(State, RP, V) :-
    State = state(_, _, _, S1, S2, _),
    perspective_score(S1, S2, RP, Base),
    possible_moves(State, Moves),
    static_eval_moves(Moves, State, 0, 0, ClosingN, RiskSum),
    eval_weight_closing_move(Wc),
    eval_weight_risk_sum(Wr),
    Bonus is Wc * ClosingN,
    Penalty is Wr * RiskSum,
    V is Base + Bonus - Penalty.

% static_eval_moves(++Moves, ++State, ++CA, ++RA, --ClosingN, --RiskSum) is det. Внутрішній згорт.
static_eval_moves([], _, C, R, C, R).
static_eval_moves([E|Es], State, CA, RA, ClosingN, RiskSum) :-
    move_metrics(State, E, Closed, Risk),
    (   Closed >= 1
    ->  C1 is CA + 1
    ;   C1 = CA
    ),
    R1 is RA + Risk,
    static_eval_moves(Es, State, C1, R1, ClosingN, RiskSum).

% ============================================================
% ordered_moves/2
% ============================================================

% ordered_moves(++State, --OrderedEdges) is det.
%
% Призначення:
%   Детермінований порядок легальних ходів: keysort за (Rank, E);
%   при однаковому Rank — стабільний порядок і tie-break за стандартним порядком терму ребра (@<).
%
% Мультипризначенність:
%   1) ordered_moves(++State, --OrderedEdges)
%      Єдине змістовне призначення.
%
%   Інші змістовні призначення відсутні.
ordered_moves(State, Ordered) :-
    possible_moves(State, Moves),
    maplist(move_order_key(State), Moves, Pairs),
    keysort(Pairs, Sorted),
    maplist(pair_value, Sorted, Ordered).

% move_order_key(++State, ++E, --K-E) is det. Внутрішній ключ для keysort.
move_order_key(State, E, K-E) :-
    move_metrics(State, E, Closed, Risk),
    move_rank(Closed, Risk, Rank),
    K = (Rank, E).

% move_rank(++Closed, ++Risk, --Rank) is det. Менший Rank — пріоритетніший хід (0 найкращий клас).
move_rank(2, _, 0) :- !.
move_rank(1, _, 1) :- !.
move_rank(0, 0, 2) :- !.
move_rank(_, _, 3).

% pair_value(++Pair, --E) is det. Витяг ребра з пари keysort.
pair_value(_-E, E).

% ============================================================
% depth1_ref_best_move/2
% ============================================================

% depth1_ref_best_move(++State, --Move) is det.
%
% Призначення:
%   Еталон для тестів: «найкращий» хід при заглибленні рівно в один півхід
%   (оцінка листів лише через static_eval/3 на дочірніх станах).
%
% Мультипризначенність:
%   1) depth1_ref_best_move(++State, --Move)
%      Єдине змістовне призначення.
%
%   Інші змістовні призначення відсутні.
depth1_ref_best_move(State, Best) :-
    State = state(_, _, _, _, _, RP),
    possible_moves(State, Moves),
    maplist(depth1_pair(State, RP), Moves, Pairs),
    keysort(Pairs, Sorted),
    Sorted = [First|_],
    pair_value(First, Best).

% depth1_pair(++State, ++RP, ++E, --K-E) is det. Внутрішній ключ для depth1_ref_best_move.
depth1_pair(State, RP, E, K-E) :-
    apply_move(State, E, Ch, _, _),
    static_eval(Ch, RP, V),
    K = (-V, E).
