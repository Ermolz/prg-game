% cli.pl — JSON-RPC over stdin/stdout with Content-Length framing.
% Run: swipl -q -g main -t halt -s cli.pl

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
    set_stream(In,  type(binary)),
    set_stream(Out, type(binary)),
    set_stream(Out, buffer(false)),
    cli_loop(In, Out).

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

% -------- framing --------

read_content_length(In, Len) :-
    read_headers(In, HeadersText, Status),
    (   Status = eof
    ->  Len = -1
    ;   parse_content_length(HeadersText, Len0),
        ( integer(Len0) -> Len = Len0 ; Len = -1 )
    ).

% read headers until blank line; split only on LF (0x0A) so CR in "65\r\n" stays in line
read_headers(In, HeadersAtom, Status) :-
    read_headers(In, [], LinesRev, Status),
    reverse(LinesRev, Lines),
    atomic_list_concat(Lines, '\r\n', Joined),
    atom_concat(Joined, '\r\n\r\n', HeadersAtom).

read_headers(In, Acc, Lines, Status) :-
    read_line_until_lf(In, Line0, LineStatus),
    (   LineStatus == eof
    ->  Lines = [], Status = eof
    ;   strip_trailing_cr(Line0, Line),
        (   Line == []
        ->  % blank line => end of headers
            maplist(codes_atom, Acc, Lines), Status = ok
        ;   read_headers(In, [Line|Acc], Lines, Status)
        )
    ).

% Read bytes until LF (10) or EOF; only LF is line terminator (CR stays in line -> "65" not "6")
read_line_until_lf(In, Codes, Status) :-
    get_byte(In, B),
    (   B =:= -1 -> Codes = [], Status = eof
    ;   B =:= 10 -> Codes = [], Status = ok
    ;   Codes = [B|Rest], read_line_until_lf_cont(In, Rest, Status)
    ).
read_line_until_lf_cont(In, Codes, Status) :-
    get_byte(In, B),
    (   B =:= -1 -> Codes = [], Status = ok
    ;   B =:= 10 -> Codes = [], Status = ok
    ;   Codes = [B|Rest], read_line_until_lf_cont(In, Rest, Status)
    ).

strip_trailing_cr(Codes, Out) :-
    (   append(Prefix, [13], Codes) -> Out = Prefix ; Out = Codes ).

codes_atom(Codes, Atom) :- atom_codes(Atom, Codes).

parse_content_length(HeadersAtom, Len) :-
    downcase_atom(HeadersAtom, Lower),
    sub_atom(Lower, I, _, _, 'content-length:'),
    I2 is I + 16,   % skip "Content-Length: " (16 chars including space)
    sub_atom(HeadersAtom, I2, _, 0, Rest),  % Rest = remainder to end (After=0)
    atom_codes(Rest, RestCodes),
    skip_spaces(RestCodes, After),
    take_digits(After, Digits),
    Digits \= [],
    number_codes(Len, Digits).

skip_spaces([C|T], R) :- (C =:= 32 ; C =:= 9), !, skip_spaces(T, R).
skip_spaces(L, L).

take_digits([C|T], [C|R]) :- C >= 0'0, C =< 0'9, !, take_digits(T, R).
take_digits(_, []).

read_exact_bytes(In, N, Bytes) :-
    length(Bytes, N),
    read_exact_bytes_(In, Bytes).

read_exact_bytes_(_In, []) :- !.
read_exact_bytes_(In, [B|Bs]) :-
    get_byte(In, B),
    B =\= -1,
    read_exact_bytes_(In, Bs).

write_json(Out, Dict) :-
    atom_json_dict(JsonAtom, Dict, [as(atom)]),
    atom_codes(JsonAtom, Codes),
    length(Codes, Len),
    format(Out, "Content-Length: ~d\r\n\r\n", [Len]),
    format(Out, "~s", [Codes]),
    flush_output(Out).

% -------- request handling --------

handle_frame(BodyBytes, Out) :-
    (   bytes_to_dict(BodyBytes, Req)
    ->  dispatch(Req, Out)
    ;   write_json(Out, json{jsonrpc:"2.0", id:null, error:json{code: -32700, message:"Parse error"}})
    ).

bytes_to_dict(Bytes, Dict) :-
    catch(
        ( atom_codes(Atom, Bytes),
          atom_json_dict(Atom, Dict, [])
        ),
        _,
        fail
    ).

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

method_atom(M, A) :-
    ( atom(M) -> A = M
    ; string(M) -> atom_string(A, M)
    ).

write_exception(Out, Id, Ex) :-
    (   Ex = error(existence_error(_, _), _)
    ->  write_json(Out, json{jsonrpc:"2.0", id:Id, error:json{code: -32603, message:"Not initialized"}})
    ;   Ex = error(_, _)
    ->  write_json(Out, json{jsonrpc:"2.0", id:Id, error:json{code: -32602, message:"Invalid request or move"}})
    ;   Ex = game_over
    ->  write_json(Out, json{jsonrpc:"2.0", id:Id, error:json{code: -32602, message:"game over"}})
    ;   Ex = no_moves
    ->  write_json(Out, json{jsonrpc:"2.0", id:Id, error:json{code: -32602, message:"no moves"}})
    ;   write_json(Out, json{jsonrpc:"2.0", id:Id, error:json{code: -32603, message:"Request error"}})
    ).

% -------- RPC methods --------

handle(init, Params, json{state:StateDict}) :-
    ( get_dict(nx, Params, NX) -> true ; NX = 2 ),
    ( get_dict(ny, Params, NY) -> true ; NY = 2 ),
    initial_state(NX, NY, State),
    nb_setval(dab_state, State),
    state_to_json(State, StateDict).

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

handle(possibleMoves, _Params, json{edges:EdgesList}) :-
    nb_getval(dab_state, State),
    possible_moves(State, Moves),
    maplist(edge_to_json, Moves, EdgesList).

handle(botMove, _Params, json{move:MoveDict, reason:ReasonStr, state:StateDict}) :-
    nb_getval(dab_state, State),
    bot_move_greedy_safe(State, Move, Reason),
    apply_move(State, Move, NewState, _Closed, _Extra),
    nb_setval(dab_state, NewState),
    edge_to_json(Move, MoveDict),
    atom_string(Reason, ReasonStr),
    state_to_json(NewState, StateDict).

handle(gameOver, _Params, json{gameOver:Go}) :-
    nb_getval(dab_state, State),
    ( game_over(State) -> Go = true ; Go = false ).

% -------- JSON helpers --------

params_to_edge(Params, Norm) :-
    get_dict(edge, Params, EdgeDict),
    get_dict(a, EdgeDict, A), get_dict(x, A, Ax), get_dict(y, A, Ay),
    get_dict(b, EdgeDict, B), get_dict(x, B, Bx), get_dict(y, B, By),
    normalize_edge(edge(point(Ax, Ay), point(Bx, By)), Norm).

state_to_json(state(NX, NY, Edges, S1, S2, Player),
              json{nx:NX, ny:NY, edges:EdgesList, s1:S1, s2:S2, player:Player}) :-
    maplist(edge_to_json, Edges, EdgesList).

edge_to_json(edge(point(Ax, Ay), point(Bx, By)),
             json{a:json{x:Ax, y:Ay}, b:json{x:Bx, y:By}}).

boxes_to_json(Boxes, List) :-
    maplist(box_to_json, Boxes, List).

box_to_json(box(X, Y), json{x:X, y:Y}).