% Yermolovych Zakhar Maksymovych
% yermolovych_dab_bot.pl
% Гра Dots and Boxes: стратегії бота (greedy_safe, minimax) та спільний API.

:- module(yermolovych_dab_bot, [
    bot_move_greedy_safe/3,
    choose_bot_move/5
]).

:- use_module(library(lists), [last/2, member/2]).

:- use_module(yermolovych_dab_core, [
    possible_moves/2,
    apply_move/5,
    game_over/1
]).

:- use_module(yermolovych_dab_metrics, [
    move_metrics/4
]).

:- use_module(yermolovych_dab_search, [
    minimax_decide/7
]).

% ============================================================
% choose_bot_move/5
% ============================================================

% choose_bot_move(++State, ++Strategy, ++Options, --Move, --Meta) is det.
%
% Призначення:
%   Єдиний вхід для бота: повертає один легальний хід Move і структуру Meta з метриками пошуку.
%
%   Meta завжди має вигляд:
%     bot_meta(strategy(S), reason(R), depth_requested(K), depth_used(D),
%              nodes(N), cutoffs(C)).
%   Для greedy_safe: depth_requested/depth_used = 1, nodes = 0, cutoffs = 0.
%   Для minimax: поля заповнюються з minimax_decide/7 (глибина в півходах — ребро = 1 півхід).
%
% Мультипризначенність:
%   1) choose_bot_move(++State, ++Strategy, ++Options, --Move, --Meta)
%      Основне змістовне призначення:
%      один детермінований хід і метадані для допустимого нетермінального стану з ходами.
%
%   Інші змістовні призначення відсутні.
%
% Помилки: throw(game_over) | domain_error(strategy,...) | domain_error(depth,...) |
%          existence_error(option,...).

choose_bot_move(State, Strategy, Options, Move, Meta) :-
    (   game_over(State)
    ->  throw(game_over)
    ;   possible_moves(State, Moves),
        (   Moves = []
        ->  throw(no_moves)
        ;   choose_bot_move_(State, Strategy, Options, Moves, Move, Meta)
        )
    ).

% choose_bot_move_(++State, ++Strategy, ++Options, ++Moves, --Move, --Meta) is det.
% Внутрішній диспетчер за Strategy; Moves — непорожній список.
choose_bot_move_(State, greedy_safe, Options, Moves, Move, Meta) :-
    validate_greedy_options(Options),
    once(choose_by_policy(State, Moves, Move, Reason)),
    Meta = bot_meta(
        strategy(greedy_safe),
        reason(Reason),
        depth_requested(1),
        depth_used(1),
        nodes(0),
        cutoffs(0)
    ).

choose_bot_move_(State, minimax, Options, _Moves, Move, Meta) :-
    parse_minimax_options(Options, Depth, UseAB),
    minimax_decide(State, Depth, UseAB, Move, Nodes, Cutoffs, DepthUsed),
    Meta = bot_meta(
        strategy(minimax),
        reason(minimax),
        depth_requested(Depth),
        depth_used(DepthUsed),
        nodes(Nodes),
        cutoffs(Cutoffs)
    ).

choose_bot_move_(_State, Strategy, _Options, _Moves, _Move, _Meta) :-
    throw(error(domain_error(strategy, Strategy), _)).

% ============================================================
% validate_greedy_options/1
% ============================================================

% validate_greedy_options(++Options) is det.
%
% Призначення:
%   Зарезервовано для майбутніх опцій greedy_safe; зараз завжди успішний
%   (додаткові ключі в Options ігноруються без зміни семантики greedy).
%
% Мультипризначенність:
%   1) validate_greedy_options(++Options)
%      Єдине змістовне призначення: «дозволити» будь-який список опцій.
validate_greedy_options(_).

% ============================================================
% parse_minimax_options/3
% ============================================================

% parse_minimax_options(++Options, --Depth, --UseAB) is det.
%
% Призначення:
%   Розбір списку опцій minimax: depth(K) з цілим K ≥ 1; alpha_beta(B) з B у {true,false}.
%   Останнє входження depth/alpha_beta у списку перемагає при дублікатах.
%
% Мультипризначенність:
%   1) parse_minimax_options(++Options, --Depth, --UseAB)
%      Єдине змістовне призначення при коректних Options.
%
%   Інші комбінації не є змістовними: при відсутній або невалідній опції — виняток
%   (existence_error / domain_error), не альтернативні розв’язки.
parse_minimax_options(Options, Depth, UseAB) :-
    (   findall(D, member(depth(D), Options), Depths),
        Depths \= []
    ->  last(Depths, D0),
        (   integer(D0),
            D0 > 0
        ->  Depth = D0
        ;   throw(error(domain_error(depth, D0), _))
        )
    ;   throw(error(existence_error(option, depth), _))
    ),
    (   findall(B, member(alpha_beta(B), Options), ABs),
        ABs \= []
    ->  last(ABs, UseAB0),
        (   UseAB0 == true
        ->  UseAB = true
        ;   UseAB0 == false
        ->  UseAB = false
        ;   throw(error(domain_error(alpha_beta, UseAB0), _))
        )
    ;   throw(error(existence_error(option, alpha_beta), _))
    ).

% ============================================================
% bot_move_greedy_safe/3
% ============================================================

% bot_move_greedy_safe(++State, --Move, --Reason) is det.
%
% Призначення:
%   Зворотна сумісність: той самий хід і причина (Reason), що й
%   choose_bot_move(State, greedy_safe, [], Move, Meta) з витягом reason з Meta.
%
% Мультипризначенність:
%   1) bot_move_greedy_safe(++State, --Move, --Reason)
%      Єдине змістовне призначення.
%
%   Інші змістовні призначення відсутні.
bot_move_greedy_safe(State, Move, Reason) :-
    choose_bot_move(State, greedy_safe, [], Move, Meta),
    Meta = bot_meta(_, reason(Reason), _, _, _, _).

% ============================================================
% choose_by_policy/4
% ============================================================

% choose_by_policy(++State, ++Moves, --Move, --Reason) is semidet.
%
% Призначення:
%   Жадібно-безпечна політика: для кожного ребра з Moves обчислюються метрики
%   (move_metrics_list/3), сортування за ключем (спочатку більше закриттів, потім менший ризик),
%   вибір першого за порядком; Reason пояснює рівень пріоритету (close_2, close_1, safe, fallback).
%
% Мультипризначенність:
%   1) choose_by_policy(++State, ++Moves, --Move, --Reason)
%      Основне змістовне призначення при непорожньому Moves.
%
%   Інші змістовні призначення відсутні.
choose_by_policy(State, Moves, Move, Reason) :-
    move_metrics_list(State, Moves, Pairs),
    keysort(Pairs, Sorted),
    Sorted = [(NegC, Risk, Move)-_|_],
    (   NegC =:= -2
    ->  Reason = greedy_close_2
    ;   NegC =:= -1
    ->  Reason = greedy_close_1
    ;   Risk =:= 0
    ->  Reason = safe_no_third_side
    ;   Reason = fallback_min_risk
    ).

% ============================================================
% move_metrics_list/3
% ============================================================

% move_metrics_list(++State, ++Moves, --KeyedPairs) is det.
%
% Призначення:
%   Будує список пар ключ-ребро для keysort/2: ключ — (NegClosed, Risk, Edge),
%   де NegClosed = -Closed з move_metrics/4.
%
% Мультипризначенність:
%   1) move_metrics_list(++State, ++Moves, --KeyedPairs)
%      Єдине змістовне призначення; для порожнього Moves — порожній список.
move_metrics_list(_State, [], []).

move_metrics_list(State, [E|Es], [K-E|Rest]) :-
    move_metrics(State, E, Closed, Risk),
    NegC is -Closed,
    K = (NegC, Risk, E),
    move_metrics_list(State, Es, Rest).
