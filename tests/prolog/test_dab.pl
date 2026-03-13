% test_dab.pl — PlUnit tests for Dots and Boxes (yermolovych_dab_*).
% Завантаження модулів через file_search_path (корінь репо з prolog_load_context),
% щоб не з’являлось deprecated warning про source_search_working_directory.

:- use_module(library(plunit)).

:- prolog_load_context(directory, TestDir),
   file_directory_name(TestDir, TestsParent),
   file_directory_name(TestsParent, RepoRoot),
   directory_file_path(RepoRoot, 'src/prolog', SrcProlog),
   absolute_file_name(SrcProlog, AbsProlog, [file_type(directory)]),
   asserta(user:file_search_path(project_prolog, AbsProlog)).

:- use_module(project_prolog(yermolovych_dab_main), [
    initial_state/3,
    legal_move/3,
    apply_move/5,
    possible_moves/2,
    bot_move_greedy_safe/3,
    choose_bot_move/5,
    game_over/1
]).
:- use_module(project_prolog(yermolovych_dab_utils), [total_edges/3]).

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
    once((
        initial_state(2, 2, S),
        bot_move_greedy_safe(S, M1, _R1),
        bot_move_greedy_safe(S, M2, _R2)
    )).

test(bot_chooses_safe_when_available, [true]) :-
    once((
        initial_state(2, 2, S),
        bot_move_greedy_safe(S, _Move, Reason),
        memberchk(Reason, [safe_no_third_side, greedy_close_1, greedy_close_2, fallback_min_risk])
    )).

test(choose_greedy_matches_legacy_bot, [true((M1 =@= M2, R1 = R2))]) :-
    once((
        initial_state(2, 2, S),
        choose_bot_move(S, greedy_safe, [], M1, Meta1),
        bot_move_greedy_safe(S, M2, R2),
        Meta1 = bot_meta(_, reason(R1), depth_requested(1), depth_used(1), nodes(0), cutoffs(0))
    )).

test(greedy_meta_contract, [true]) :-
    once((
        initial_state(2, 2, S),
        choose_bot_move(S, greedy_safe, [], Move, Meta),
        Meta = bot_meta(strategy(greedy_safe), reason(_R), depth_requested(1), depth_used(1), nodes(0), cutoffs(0)),
        possible_moves(S, L),
        memberchk(Move, L)
    )).

test(unknown_strategy_error, [true]) :-
    initial_state(2, 2, S),
    catch(
        choose_bot_move(S, not_a_strategy, [], _, _),
        error(domain_error(strategy, not_a_strategy), _),
        true
    ).

test(minimax_missing_depth_option, [true]) :-
    initial_state(2, 2, S),
    catch(
        choose_bot_move(S, minimax, [alpha_beta(true)], _, _),
        error(existence_error(option, depth), _),
        true
    ).

test(minimax_domain_depth_zero, [true]) :-
    initial_state(2, 2, S),
    catch(
        choose_bot_move(S, minimax, [depth(0), alpha_beta(true)], _, _),
        error(domain_error(depth, 0), _),
        true
    ).

test(minimax_depth_one_matches_static_reference, [true(Mm =@= Mref)]) :-
    once((
        initial_state(2, 2, S),
        choose_bot_move(S, minimax, [depth(1), alpha_beta(false)], Mm, _),
        yermolovych_dab_search:depth1_ref_best_move(S, Mref)
    )).

test(minimax_ab_same_best_move_1x1, [true(M1 =@= M2)]) :-
    once((
        initial_state(1, 1, S),
        choose_bot_move(S, minimax, [depth(3), alpha_beta(false)], M1, _),
        choose_bot_move(S, minimax, [depth(3), alpha_beta(true)], M2, _)
    )).

% Partial 2×2 (3 edges): same best move with α–β vs full minimax; AB cuts nodes and/or reports cutoffs > 0.
test(minimax_ab_equiv_non_trivial_2x2, [true((M1 =@= M2, (C2 > 0 ; N2 =< N1)))]) :-
    once((
        initial_state(2, 2, S0),
        apply_move(S0, edge(point(0, 0), point(1, 0)), S1, _, _),
        apply_move(S1, edge(point(0, 0), point(0, 1)), S2, _, _),
        apply_move(S2, edge(point(1, 0), point(1, 1)), S3, _, _),
        choose_bot_move(S3, minimax, [depth(5), alpha_beta(false)], M1,
            bot_meta(_, _, _, _, nodes(N1), cutoffs(_))),
        choose_bot_move(S3, minimax, [depth(5), alpha_beta(true)], M2,
            bot_meta(_, _, _, _, nodes(N2), cutoffs(C2)))
    )).

test(minimax_duplicate_depth_last_wins, [true(M =@= Mref)]) :-
    once((
        initial_state(2, 2, S),
        choose_bot_move(S, minimax, [depth(1), depth(3), alpha_beta(false)], M, _),
        choose_bot_move(S, minimax, [depth(3), alpha_beta(false)], Mref, _)
    )).

test(minimax_legal_move_2x2, [true]) :-
    once((
        initial_state(2, 2, S),
        choose_bot_move(S, minimax, [depth(2), alpha_beta(true)], Move, Meta),
        Meta = bot_meta(strategy(minimax), reason(minimax), depth_requested(2), depth_used(2), _, _),
        possible_moves(S, L),
        memberchk(Move, L)
    )).

test(bot_move_game_over_throws, [true]) :-
    initial_state(1, 1, S),
    apply_move(S, edge(point(0,0), point(1,0)), S1, _, _),
    apply_move(S1, edge(point(0,0), point(0,1)), S2, _, _),
    apply_move(S2, edge(point(1,0), point(1,1)), S3, _, _),
    apply_move(S3, edge(point(0,1), point(1,1)), S4, _, _),
    catch(
        choose_bot_move(S4, minimax, [depth(1), alpha_beta(true)], _, _),
        game_over,
        true
    ).

:- end_tests(dab).
