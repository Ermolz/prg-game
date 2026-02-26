% cli.pl — JSON-RPC over stdin/stdout with Content-Length framing.
% Run: swipl -g main -t halt -s cli.pl  (cwd = directory containing this file and yermolovych_dab_*.pl)

:- use_module(library(http/json)).
:- use_module(yermolovych_dab_main, [
    initial_state/3,
    legal_move/3,
    apply_move/5,
    possible_moves/2,
    game_over/1,
    bot_move_greedy_safe/3
]).
:- use_module(yermolovych_dab_utils, [normalize_edge/2]).

main :-
    current_input(In),
    current_output(Out),
    cli_loop(In, Out).

cli_loop(In, Out) :-
    (   read_content_length(In, Len)
    ->  (   Len >= 0,
            read_n_bytes(In, Len, Bytes),
            atom_codes(BodyAtom, Bytes),
            atom_json_dict(BodyAtom, RequestDict, [])
        ->  dispatch(RequestDict, Out),
            cli_loop(In, Out)
        ;   true
        )
    ;   true
    ).

read_content_length(Stream, N) :-
    read_until_rnrn(Stream, HeaderCodes),
    (   HeaderCodes == end_of_file
    ->  N = -1
    ;   parse_content_length(HeaderCodes, N)
    ).

read_until_rnrn(Stream, Result) :-
    read_until_rnrn(Stream, [], Result).
read_until_rnrn(Stream, Acc, Result) :-
    get_byte(Stream, B),
    (   B == -1
    ->  Result = end_of_file
    ;   append(Acc, [B], Acc1),
        (   suffix_rnrn(Acc1)
        ->  Result = Acc1
        ;   read_until_rnrn(Stream, Acc1, Result)
        )
    ).

suffix_rnrn([13, 10, 13, 10 | _]).
suffix_rnrn([_ | T]) :- suffix_rnrn(T).

parse_content_length(Codes, N) :-
    atom_codes(HeaderAtom, Codes),
    downcase_atom(HeaderAtom, Lower),
    (   sub_atom(Lower, I, _, _, 'content-length:')
    ->  I2 is I + 16,
        sub_atom(HeaderAtom, I2, _, _, Rest),
        atom_codes(Rest, RestCodes),
        skip_spaces_digits(RestCodes, NumCodes),
        (   NumCodes = []
        ->  N = -1
        ;   number_codes(N, NumCodes)
        )
    ;   N = -1
    ).
parse_content_length(_, -1).

skip_spaces_digits([], []).
skip_spaces_digits([C|T], R) :- ( C =:= 32 ; C =:= 9 ), skip_spaces_digits(T, R).
skip_spaces_digits([C|T], [C|R]) :- C >= 0'0, C =< 0'9, take_digits(T, R).
skip_spaces_digits([13|_], []) :- !.
skip_spaces_digits([10|_], []) :- !.
take_digits([], []).
take_digits([C|T], [C|R]) :- C >= 0'0, C =< 0'9, !, take_digits(T, R).
take_digits(_, []).

read_n_bytes(Stream, N, Bytes) :-
    read_n_bytes(Stream, N, [], Bytes).
read_n_bytes(_, 0, Acc, Bytes) :- !, reverse(Acc, Bytes).
read_n_bytes(Stream, N, Acc, Bytes) :-
    get_byte(Stream, B),
    (   B == -1
    ->  reverse(Acc, Bytes)
    ;   N1 is N - 1,
        read_n_bytes(Stream, N1, [B|Acc], Bytes)
    ).

dispatch(RequestDict, Out) :-
    (   get_dict(id, RequestDict, Id)
    ->  true
    ;   Id = null
    ),
    (   get_dict(method, RequestDict, Method),
        method_nonempty(Method)
    ->  (   get_dict(params, RequestDict, Params)
        ->  true
        ;   Params = _{}
        ),
        (   catch(handle(Method, Params, Result), Ex, (catch_handler(Ex, Out, Id), fail))
        ->  write_result(Out, Id, Result)
        ;   true
        )
    ;   write_error(Out, Id, -32600, "Invalid request: missing method")
    ).

method_nonempty(M) :- M \= "", M \= null, ( atom(M) -> true ; M \= [] ).

catch_handler(Ex, Out, Id) :-
    (   Ex = error(existence_error(_, _), _)
    ->  write_error(Out, Id, -32603, "Not initialized")
    ;   Ex = error(_, _)
    ->  write_error(Out, Id, -32602, "Invalid request or move")
    ;   Ex = game_over
    ->  write_error(Out, Id, -32602, "game over")
    ;   Ex = no_moves
    ->  write_error(Out, Id, -32602, "no moves")
    ;   write_error(Out, Id, -32603, "Not initialized")
    ).

handle(Method, Params, json{state: StateDict}) :-
    method_name(Method, init),
    (   get_dict(nx, Params, NX)
    ->  true
    ;   NX = 2
    ),
    (   get_dict(ny, Params, NY)
    ->  true
    ;   NY = 2
    ),
    initial_state(NX, NY, State),
    nb_setval(dab_state, State),
    state_to_json(State, StateDict).

handle(Method, Params, json{state: StateDict, closedBoxes: BoxesDict, extraTurn: ExtraBool}) :-
    method_name(Method, applyMove),
    nb_getval(dab_state, State),
    params_to_edge(Params, Move),
    State = state(_, _, Edges, _, _, _),
    (   legal_move(State, Move, Edges)
    ->  apply_move(State, Move, NewState, ClosedBoxes, ExtraTurn),
        nb_setval(dab_state, NewState),
        state_to_json(NewState, StateDict),
        boxes_to_json(ClosedBoxes, BoxesDict),
        (   ExtraTurn = yes -> ExtraBool = true ; ExtraBool = false )
    ;   throw(error(invalid_move, apply_move))
    ).

handle(Method, _Params, json{edges: EdgesList}) :-
    method_name(Method, possibleMoves),
    nb_getval(dab_state, State),
    possible_moves(State, Moves),
    maplist(edge_to_json, Moves, EdgesList).

handle(Method, _Params, json{move: MoveDict, reason: ReasonAtom, state: StateDict}) :-
    method_name(Method, botMove),
    nb_getval(dab_state, State),
    bot_move_greedy_safe(State, Move, Reason),
    apply_move(State, Move, NewState, _Closed, _Extra),
    nb_setval(dab_state, NewState),
    edge_to_json(Move, MoveDict),
    atom_string(Reason, ReasonAtom),
    state_to_json(NewState, StateDict).

handle(Method, _Params, json{gameOver: Go}) :-
    method_name(Method, gameOver),
    nb_getval(dab_state, State),
    (   game_over(State) -> Go = true ; Go = false ).

params_to_edge(Params, Norm) :-
    get_dict(edge, Params, EdgeDict),
    get_dict(a, EdgeDict, A), get_dict(x, A, Ax), get_dict(y, A, Ay),
    get_dict(b, EdgeDict, B), get_dict(x, B, Bx), get_dict(y, B, By),
    normalize_edge(edge(point(Ax, Ay), point(Bx, By)), Norm).

% method_name(Method, Name): Method from JSON (atom or string) matches Name (atom).
method_name(Method, Name) :- Method == Name.
method_name(Method, Name) :- atom_string(Name, Method).

state_to_json(state(NX, NY, Edges, S1, S2, Player), json{nx: NX, ny: NY, edges: EdgesList, s1: S1, s2: S2, player: Player}) :-
    maplist(edge_to_json, Edges, EdgesList).

edge_to_json(edge(point(Ax, Ay), point(Bx, By)), json{a: json{x: Ax, y: Ay}, b: json{x: Bx, y: By}}).

boxes_to_json(Boxes, List) :-
    maplist(box_to_json, Boxes, List).
box_to_json(box(X, Y), json{x: X, y: Y}).

write_result(Out, Id, Result) :-
    ResponseDict = json{jsonrpc: "2.0", id: Id, result: Result},
    atom_json_dict(JsonAtom, ResponseDict, [as(atom)]),
    atom_length(JsonAtom, Len),
    format(Out, "Content-Length: ~w\r\n\r\n", [Len]),
    format(Out, "~s", [JsonAtom]),
    flush_output(Out).

write_error(Out, Id, Code, Message) :-
    ErrDict = json{code: Code, message: Message},
    ResponseDict = json{jsonrpc: "2.0", id: Id, error: ErrDict},
    atom_json_dict(JsonAtom, ResponseDict, [as(atom)]),
    atom_length(JsonAtom, Len),
    format(Out, "Content-Length: ~w\r\n\r\n", [Len]),
    format(Out, "~s", [JsonAtom]),
    flush_output(Out).
