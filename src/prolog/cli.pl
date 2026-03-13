% Yermolovych Zakhar Maksymovych
% cli.pl — JSON-RPC over stdin/stdout with Content-Length framing.
% Run: swipl -q -g main -t halt -s cli.pl (cwd = src/prolog або корінь репо з шляхом до модулів)

:- use_module(library(json)).
:- use_module(library(lists), [memberchk/2]).

:- use_module(yermolovych_dab_main, [
    initial_state/3,
    legal_move/3,
    apply_move/5,
    possible_moves/2,
    game_over/1,
    choose_bot_move/5
]).
:- use_module(yermolovych_dab_utils, [normalize_edge/2]).

% ============================================================
% Точка входу та цикл CLI
% ============================================================

% main is det.
%
% Призначення:
%   Запуск інтерфейсу JSON-RPC: stdin/stdout у бінарному режимі, без буферизації відповіді,
%   щоб Content-Length коректно доходив до клієнта (Electron тощо).
%
% Мультипризначенність:
%   1) main
%      Єдине змістовне призначення — стартувати cli_loop/2 до EOF.
main :-
    current_input(In),
    current_output(Out),
    set_stream(In,  type(binary)),
    set_stream(Out, type(binary)),
    set_stream(Out, buffer(false)),
    cli_loop(In, Out).

% cli_loop(++In, ++Out) is det.
%
% Призначення:
%   Читає кадри (HTTP-подібні заголовки + тіло фіксованої довжини), обробляє handle_frame/2,
%   рекурсивно продовжує до кінця вводу або Len ≤ 0.
%
% Мультипризначенність:
%   1) cli_loop(++In, ++Out) — єдине змістовне призначення.
cli_loop(In, Out) :-
    (   read_content_length(In, Len)
    ->  (   Len =< 0
        ->  true
        ;   (   read_exact_bytes(In, Len, BodyBytes)
            ->  handle_frame(BodyBytes, Out),
                cli_loop(In, Out)
            ;   write_json(Out, json{jsonrpc:"2.0", id:null,
                                     error:json{code: -32603, message:"Unexpected EOF while reading body"}}),
                cli_loop(In, Out)
            )
        )
    ;   true
    ).

% ============================================================
% Framing: Content-Length і читання байтів
% ============================================================

% read_content_length(++In, --Len) is semidet.
% Len: довжина тіла або -1 при EOF/невалідному заголовку.
% Мультипризначенність: одне Len для відкритого потоку на кадр.
read_content_length(In, Len) :-
    read_headers(In, HeadersText, Status),
    (   Status = eof
    ->  Len = -1
    ;   parse_content_length(HeadersText, Len0),
        ( integer(Len0) -> Len = Len0 ; Len = -1 )
    ).

% read_headers(++In, --HeadersAtom, --Status) is det.
% Збирає рядки до порожнього рядка; Status = eof | ok. atom_concat формує блок для parse_content_length/2.
read_headers(In, HeadersAtom, Status) :-
    read_headers(In, [], LinesRev, Status),
    reverse(LinesRev, Lines),
    atomic_list_concat(Lines, '\r\n', Joined),
    atom_concat(Joined, '\r\n\r\n', HeadersAtom).

% read_headers(++In, ++Acc, --Lines, --Status) is det.
% Внутрішня рекурсія з накопиченням рядків (коди символів).
read_headers(In, Acc, Lines, Status) :-
    read_line_until_lf(In, Line0, LineStatus),
    (   LineStatus == eof
    ->  Lines = [], Status = eof
    ;   strip_trailing_cr(Line0, Line),
        (   Line == []
        ->  maplist(codes_atom, Acc, Lines), Status = ok
        ;   read_headers(In, [Line|Acc], Lines, Status)
        )
    ).

% read_line_until_lf(++In, --Codes, --Status) is det.
% Читання до LF (10); get_byte — низькорівневе читання байта (див. SWI binary stream).
read_line_until_lf(In, Codes, Status) :-
    get_byte(In, B),
    (   B =:= -1 -> Codes = [], Status = eof
    ;   B =:= 10 -> Codes = [], Status = ok
    ;   Codes = [B|Rest], read_line_until_lf_cont(In, Rest, Status)
    ).

% read_line_until_lf_cont(++In, --Codes, --Status) is det.
% Продовження рядка після першого байта.
read_line_until_lf_cont(In, Codes, Status) :-
    get_byte(In, B),
    (   B =:= -1 -> Codes = [], Status = ok
    ;   B =:= 10 -> Codes = [], Status = ok
    ;   Codes = [B|Rest], read_line_until_lf_cont(In, Rest, Status)
    ).

% strip_trailing_cr(++Codes, --Out) is det.
% Прибирає CR (13) перед LF у стилі Windows.
strip_trailing_cr(Codes, Out) :-
    (   append(Prefix, [13], Codes) -> Out = Prefix ; Out = Codes ).

% codes_atom(++Codes, --Atom) is det.
% maplist-обгортка для atom_codes/2.
codes_atom(Codes, Atom) :- atom_codes(Atom, Codes).

% parse_content_length(++HeadersAtom, --Len) is semidet.
% Шукає підрядок 'content-length:' у нижньому регістрі; number_codes перетворює цифри в число.
parse_content_length(HeadersAtom, Len) :-
    downcase_atom(HeadersAtom, Lower),
    sub_atom(Lower, I, _, _, 'content-length:'),
    I2 is I + 16,
    sub_atom(HeadersAtom, I2, _, 0, Rest),
    atom_codes(Rest, RestCodes),
    skip_spaces(RestCodes, After),
    take_digits(After, Digits),
    Digits \= [],
    number_codes(Len, Digits).

% skip_spaces(++Codes, --Rest) is det.
% Пропускає пробіл і табуляцію на початку.
skip_spaces([C|T], R) :- (C =:= 32 ; C =:= 9), !, skip_spaces(T, R).
skip_spaces(L, L).

% take_digits(++Codes, --Digits) is det.
% Збирає послідовність ASCII-цифр на початку списку кодів.
take_digits([C|T], [C|R]) :- C >= 0'0, C =< 0'9, !, take_digits(T, R).
take_digits(_, []).

% read_exact_bytes(++In, ++N, --Bytes) is semidet.
% Точно N байтів або неуспіх при EOF (get_byte = -1 у read_exact_bytes_/2).
read_exact_bytes(In, N, Bytes) :-
    length(Bytes, N),
    read_exact_bytes_(In, Bytes).

read_exact_bytes_(_In, []) :- !.
read_exact_bytes_(In, [B|Bs]) :-
    get_byte(In, B),
    B =\= -1,
    read_exact_bytes_(In, Bs).

% read_exact_bytes_(++In, ++Bytes) is semidet. Внутрішній цикл читання списку байтів.

% write_json(++Out, ++Dict) is det.
% atom_json_dict серіалізує SWI dict у JSON-атом; format виводить заголовок Content-Length і тіло.
write_json(Out, Dict) :-
    atom_json_dict(JsonAtom, Dict, [as(atom)]),
    atom_codes(JsonAtom, Codes),
    length(Codes, Len),
    format(Out, "Content-Length: ~d\r\n\r\n", [Len]),
    format(Out, "~s", [Codes]),
    flush_output(Out).

% ============================================================
% Обробка запиту JSON-RPC
% ============================================================

% handle_frame(++BodyBytes, ++Out) is det.
% Розбір JSON або відповідь -32700 Parse error.
handle_frame(BodyBytes, Out) :-
    (   bytes_to_dict(BodyBytes, Req)
    ->  dispatch(Req, Out)
    ;   write_json(Out, json{jsonrpc:"2.0", id:null, error:json{code: -32700, message:"Parse error"}})
    ).

% bytes_to_dict(++Bytes, --Dict) is semidet.
% catch/3 гасить помилки atom_json_dict при невалідному JSON.
bytes_to_dict(Bytes, Dict) :-
    catch(
        ( atom_codes(Atom, Bytes),
          atom_json_dict(Atom, Dict, [])
        ),
        _,
        fail
    ).

% dispatch(++Req, ++Out) is det.
% get_dict — доступ до полів SWI dict; method_atom нормалізує string|atom для handle/3.
dispatch(Req, Out) :-
    ( get_dict(id, Req, Id0) -> Id = Id0 ; Id = null ),
    ( get_dict(method, Req, M0), method_atom(M0, Method)
    ->  ( get_dict(params, Req, P0) -> Params = P0 ; Params = _{} ),
        (   catch(handle(Method, Params, Result), Ex, (write_exception(Out, Id, Ex), fail))
        ->  write_json(Out, json{jsonrpc:"2.0", id:Id, result:Result})
        ;   true
        )
    ;   write_json(Out, json{jsonrpc:"2.0", id:Id, error:json{code: -32600, message:"Invalid Request"}})
    ).

% method_atom(++M, --A) is semidet.
% Перетворює ім’я методу з JSON на atom.
method_atom(M, A) :-
    ( atom(M) -> A = M
    ; string(M) -> atom_string(A, M)
    ).

% write_exception(++Out, ++Id, ++Ex) is det.
%
% Призначення:
%   Мапінг винятків Prolog і помилок на JSON-RPC error object (коди JSON-RPC / кастомні повідомлення).
%   -32602: параметри, хід, game_over, no_moves, domain_error, generic error(_,_);
%   -32603: Not initialized (existence_error(variable, dab_state)), невідомий виняток.
%
% Мультипризначенність:
%   1) write_exception(++Out, ++Id, ++Ex) — одна відповідь на кожний Ex.
write_exception(Out, Id, Ex) :-
    (   Ex = error(existence_error(option, depth), _)
    ->  write_json(Out, json{jsonrpc:"2.0", id:Id, error:json{code: -32602, message:"missing option: depth"}})
    ;   Ex = error(existence_error(option, alpha_beta), _)
    ->  write_json(Out, json{jsonrpc:"2.0", id:Id, error:json{code: -32602, message:"missing option: alphaBeta"}})
    ;   Ex = error(existence_error(variable, dab_state), _)
    ->  write_json(Out, json{jsonrpc:"2.0", id:Id, error:json{code: -32603, message:"Not initialized"}})
    ;   Ex = error(domain_error(strategy, _), _)
    ->  write_json(Out, json{jsonrpc:"2.0", id:Id, error:json{code: -32602, message:"domain error: strategy"}})
    ;   Ex = error(domain_error(depth, _), _)
    ->  write_json(Out, json{jsonrpc:"2.0", id:Id, error:json{code: -32602, message:"domain error: depth"}})
    ;   Ex = error(domain_error(alpha_beta, _), _)
    ->  write_json(Out, json{jsonrpc:"2.0", id:Id, error:json{code: -32602, message:"domain error: alphaBeta"}})
    ;   Ex = error(_, _)
    ->  write_json(Out, json{jsonrpc:"2.0", id:Id, error:json{code: -32602, message:"Invalid request or move"}})
    ;   Ex = game_over
    ->  write_json(Out, json{jsonrpc:"2.0", id:Id, error:json{code: -32602, message:"game over"}})
    ;   Ex = no_moves
    ->  write_json(Out, json{jsonrpc:"2.0", id:Id, error:json{code: -32602, message:"no moves"}})
    ;   write_json(Out, json{jsonrpc:"2.0", id:Id, error:json{code: -32603, message:"Request error"}})
    ).

% ============================================================
% JSON-RPC: handle/3 (метод як atom)
% ============================================================
% Допоміжні предикати між клаузами handle/3 вимагають :- discontiguous handle/3.
:- discontiguous handle/3.

% handle(++Method, ++Params, --ResultDict) is semidet.
% init: nb_setval(dab_state, ...) — глобальний стан сесії CLI.
handle(init, Params, json{state:StateDict}) :-
    ( get_dict(nx, Params, NX) -> true ; NX = 2 ),
    ( get_dict(ny, Params, NY) -> true ; NY = 2 ),
    initial_state(NX, NY, State),
    nb_setval(dab_state, State),
    state_to_json(State, StateDict).

% applyMove: legal_move + apply_move; оновлення dab_state.
handle(applyMove, Params, json{state:StateDict, closedBoxes:BoxesDict, extraTurn:ExtraBool}) :-
    nb_getval(dab_state, State),
    params_to_edge(Params, Move),
    State = state(_, _, Edges, _, _, _),
    (   legal_move(State, Move, Edges)
    ->  apply_move(State, Move, NewState, ClosedBoxes, ExtraTurn),
        nb_setval(dab_state, NewState),
        state_to_json(NewState, StateDict),
        boxes_to_json(ClosedBoxes, BoxesDict),
        ( ExtraTurn = yes -> ExtraBool = true ; ExtraBool = false )
    ;   throw(error(invalid_move, apply_move))
    ).

% possibleMoves: список нормалізованих ребер з possible_moves/2.
handle(possibleMoves, _Params, json{edges:EdgesList}) :-
    nb_getval(dab_state, State),
    possible_moves(State, Moves),
    maplist(edge_to_json, Moves, EdgesList).

% botMove: choose_bot_move/5, застосування ходу, meta у відповіді.
handle(botMove, Params, json{move:MoveDict, reason:ReasonStr, state:StateDict, meta:MetaDict}) :-
    nb_getval(dab_state, State),
    bot_move_params(Params, Strategy, Options),
    choose_bot_move(State, Strategy, Options, Move, Meta),
    apply_move(State, Move, NewState, _Closed, _Extra),
    nb_setval(dab_state, NewState),
    edge_to_json(Move, MoveDict),
    meta_reason_string(Meta, ReasonStr),
    state_to_json(NewState, StateDict),
    bot_meta_to_json(Meta, MetaDict).

% ============================================================
% Параметри botMove (strategy, depth, alphaBeta)
% ============================================================

% bot_move_params(++Params, --Strategy, --Options) is det.
%
% Призначення:
%   Якщо strategy відсутній — greedy_safe і [].
%   Інакше resolve_strategy/2 і для minimax — minimax_options_from_params/2.
%
% Мультипризначенність:
%   1) bot_move_params(++Params, --Strategy, --Options) — одна трійка для коректного Params.
bot_move_params(Params, greedy_safe, []) :-
    \+ get_dict(strategy, Params, _),
    !.

bot_move_params(Params, Strategy, Options) :-
    get_dict(strategy, Params, S0),
    resolve_strategy(S0, Strategy),
    (   Strategy = greedy_safe
    ->  Options = []
    ;   Strategy = minimax
    ->  minimax_options_from_params(Params, Options)
    ).

% resolve_strategy(++S0, --Strategy) is semidet.
% Допустимі синоніми greedy (atom/string); інакше domain_error через останню клаузу.
resolve_strategy(S0, greedy_safe) :-
    (   atom(S0),
        memberchk(S0, [greedy_safe, greedySafe])
    ->  true
    ;   string(S0),
        memberchk(S0, ["greedy_safe", "greedySafe"])
    ),
    !.

resolve_strategy(S0, minimax) :-
    (   atom(S0),
        S0 = minimax
    ->  true
    ;   string(S0),
        S0 = "minimax"
    ),
    !.

resolve_strategy(S0, _) :-
    throw(error(domain_error(strategy, S0), _)).

% minimax_options_from_params(++Params, --Options) is det.
% Options = [depth(D), alpha_beta(AB)]; alphaBeta або alpha_b у JSON.
minimax_options_from_params(Params, [depth(D), alpha_beta(AB)]) :-
    (   get_dict(depth, Params, D0)
    ->  (   depth_positive_integer(D0, D)
        ->  true
        ;   throw(error(domain_error(depth, D0), _))
        )
    ;   throw(error(existence_error(option, depth), _))
    ),
    (   get_dict(alphaBeta, Params, AB0)
    ->  json_bool(AB0, AB)
    ;   get_dict(alpha_beta, Params, AB0)
    ->  json_bool(AB0, AB)
    ;   throw(error(existence_error(option, alpha_beta), _))
    ).

% depth_positive_integer(++Raw, --D) is semidet.
% Суворий контракт: лише цілі Prolog з JSON (integer), D > 0; без float/round і без рядків.
depth_positive_integer(D, D) :-
    integer(D),
    D > 0.

% json_bool(++Raw, --Bool) is det.
% Булеві значення з JSON (atom true/false або рядки "true"/"false").
json_bool(true, true).
json_bool(false, false).
json_bool(A, B) :-
    atom(A),
    (   A = true
    ->  B = true
    ;   A = false
    ->  B = false
    ),
    !.
json_bool(S, B) :-
    string(S),
    !,
    (   S = "true"
    ->  B = true
    ;   S = "false"
    ->  B = false
    ;   throw(error(domain_error(alpha_beta, S), _))
    ).

json_bool(X, _) :-
    throw(error(domain_error(alpha_beta, X), _)).

% meta_reason_string(++Meta, --Str) is det.
% Рядок reason для JSON (minimax або atom_string інших greedy-причин).
meta_reason_string(bot_meta(_, reason(R), _, _, _, _), Str) :-
    (   R = minimax
    ->  Str = "minimax"
    ;   atom_string(R, Str)
    ).

% bot_meta_to_json(++Meta, --JsonDict) is det.
% Плоский dict для полів depthRequested, depthUsed, nodes, cutoffs.
bot_meta_to_json(
    bot_meta(strategy(S), reason(R), depth_requested(Dr), depth_used(Du), nodes(N), cutoffs(C)),
    json{
        strategy:StrategyStr,
        reason:ReasonStr,
        depthRequested:Dr,
        depthUsed:Du,
        nodes:N,
        cutoffs:C
    }
) :-
    atom_string(S, StrategyStr),
    (   R = minimax
    ->  ReasonStr = "minimax"
    ;   atom_string(R, ReasonStr)
    ).

% gameOver: чи заповнені всі ребра (game_over/1).
handle(gameOver, _Params, json{gameOver:Go}) :-
    nb_getval(dab_state, State),
    ( game_over(State) -> Go = true ; Go = false ).

% ============================================================
% Допоміжні перетворення JSON ↔ терми гри
% ============================================================

% params_to_edge(++Params, --Norm) is semidet.
% Витягує вкладений dict edge{a,b} з координатами точок; normalize_edge з ядра.
params_to_edge(Params, Norm) :-
    get_dict(edge, Params, EdgeDict),
    get_dict(a, EdgeDict, A), get_dict(x, A, Ax), get_dict(y, A, Ay),
    get_dict(b, EdgeDict, B), get_dict(x, B, Bx), get_dict(y, B, By),
    normalize_edge(edge(point(Ax, Ay), point(Bx, By)), Norm).

% state_to_json(++State, --JsonDict) is det.
state_to_json(state(NX, NY, Edges, S1, S2, Player),
              json{nx:NX, ny:NY, edges:EdgesList, s1:S1, s2:S2, player:Player}) :-
    maplist(edge_to_json, Edges, EdgesList).

% edge_to_json(++Edge, --JsonDict) is det.

edge_to_json(edge(point(Ax, Ay), point(Bx, By)),
             json{a:json{x:Ax, y:Ay}, b:json{x:Bx, y:By}}).

% boxes_to_json(++Boxes, --List) is det.

boxes_to_json(Boxes, List) :-
    maplist(box_to_json, Boxes, List).

% box_to_json(++Box, --JsonDict) is det.

box_to_json(box(X, Y), json{x:X, y:Y}).
