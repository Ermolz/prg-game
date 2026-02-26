#!/usr/bin/env python3
"""
JSON-RPC over stdin/stdout with Content-Length framing (LSP-style).
Input: "Content-Length: N\r\n\r\n" + N bytes UTF-8 JSON per request.
Output: same format per response. Logging only to stderr.
"""
import json
import sys
from typing import Any, Dict, List, Optional, Tuple

from dab import initial_state, apply_move, possible_moves, greedy_safe_bot_move
from dab.core import game_over
from dab.state import State
from dab.types import Edge
from dab.util import normalize_edge

HEADER_END = b"\r\n\r\n"
CONTENT_LENGTH_PREFIX = "Content-Length: "


def log(msg: str) -> None:
    print(f"[cli] {msg}", file=sys.stderr, flush=True)


def read_content_length() -> int:
    buf = bytearray()
    while len(buf) < 4 or buf[-4:] != HEADER_END:
        b = sys.stdin.buffer.read(1)
        if not b:
            return -1
        buf += b
    header = buf[:-4].decode("ascii")
    idx = header.lower().find("content-length:")
    if idx < 0:
        return -1
    idx += len(CONTENT_LENGTH_PREFIX)
    end = header.find("\r\n", idx)
    if end < 0:
        end = len(header)
    num = header[idx:end].strip()
    try:
        return int(num)
    except ValueError:
        return -1


def read_exactly(n: int) -> Optional[bytes]:
    data = b""
    while len(data) < n:
        chunk = sys.stdin.buffer.read(n - len(data))
        if not chunk:
            return None
        data += chunk
    return data


def write_frame(body: str) -> None:
    body_bytes = body.encode("utf-8")
    header = f"Content-Length: {len(body_bytes)}\r\n\r\n"
    sys.stdout.buffer.write(header.encode("ascii"))
    sys.stdout.buffer.write(body_bytes)
    sys.stdout.buffer.flush()


def write_result(id_val: Any, result: Dict[str, Any]) -> None:
    obj = {"jsonrpc": "2.0", "id": id_val, "result": result}
    write_frame(json.dumps(obj))


def write_error(id_val: Any, code: int, message: str) -> None:
    obj = {
        "jsonrpc": "2.0",
        "id": id_val,
        "error": {"code": code, "message": message},
    }
    write_frame(json.dumps(obj))


def edge_to_json(e: Edge) -> Dict[str, Any]:
    (a, b) = e
    return {"a": {"x": a[0], "y": a[1]}, "b": {"x": b[0], "y": b[1]}}


def state_to_json(s: State) -> Dict[str, Any]:
    edges_list = [edge_to_json(e) for e in sorted(s.edges)]
    return {
        "nx": s.nx,
        "ny": s.ny,
        "edges": edges_list,
        "s1": s.s1,
        "s2": s.s2,
        "player": s.player,
    }


def parse_edge(params: Dict[str, Any]) -> Edge:
    edge = params.get("edge")
    if not edge or "a" not in edge or "b" not in edge:
        raise ValueError("Missing params.edge with a and b")
    a = (int(edge["a"]["x"]), int(edge["a"]["y"]))
    b = (int(edge["b"]["x"]), int(edge["b"]["y"]))
    return normalize_edge((a, b))


def handle_init(params: Optional[Dict], state_ref: List[Optional[State]]) -> Dict[str, Any]:
    nx = 2
    ny = 2
    if params:
        nx = int(params.get("nx", 2))
        ny = int(params.get("ny", 2))
    state_ref[0] = initial_state(nx, ny)
    return {"state": state_to_json(state_ref[0])}


def handle_apply_move(params: Optional[Dict], state_ref: List[Optional[State]]) -> Dict[str, Any]:
    if state_ref[0] is None:
        raise RuntimeError("Not initialized")
    if not params:
        raise ValueError("Missing params")
    edge = parse_edge(params)
    new_s, closed, extra_turn = apply_move(state_ref[0], edge)
    state_ref[0] = new_s
    closed_boxes = [{"x": x, "y": y} for (x, y) in closed]
    return {
        "state": state_to_json(new_s),
        "closedBoxes": closed_boxes,
        "extraTurn": extra_turn,
    }


def handle_possible_moves(state_ref: List[Optional[State]]) -> Dict[str, Any]:
    if state_ref[0] is None:
        raise RuntimeError("Not initialized")
    edges = possible_moves(state_ref[0])
    return {"edges": [edge_to_json(e) for e in edges]}


def handle_bot_move(state_ref: List[Optional[State]]) -> Dict[str, Any]:
    if state_ref[0] is None:
        raise RuntimeError("Not initialized")
    move, reason = greedy_safe_bot_move(state_ref[0])
    new_s, _, _ = apply_move(state_ref[0], move)
    state_ref[0] = new_s
    return {
        "move": edge_to_json(move),
        "reason": reason,
        "state": state_to_json(new_s),
    }


def handle_game_over(state_ref: List[Optional[State]]) -> Dict[str, Any]:
    if state_ref[0] is None:
        raise RuntimeError("Not initialized")
    return {"gameOver": game_over(state_ref[0])}


def main() -> None:
    state_ref: List[Optional[State]] = [None]

    while True:
        content_length = read_content_length()
        if content_length < 0:
            break

        body_bytes = read_exactly(content_length)
        if body_bytes is None:
            break

        line = body_bytes.decode("utf-8")
        try:
            req = json.loads(line)
        except json.JSONDecodeError as e:
            write_error(None, -32700, str(e))
            continue

        id_val = req.get("id")
        method = req.get("method") or ""
        params = req.get("params")
        if isinstance(params, dict):
            pass
        else:
            params = None

        if not method:
            write_error(id_val, -32600, "Invalid request: missing method")
            continue

        try:
            if method == "init":
                result = handle_init(params, state_ref)
            elif method == "applyMove":
                result = handle_apply_move(params, state_ref)
            elif method == "possibleMoves":
                result = handle_possible_moves(state_ref)
            elif method == "botMove":
                result = handle_bot_move(state_ref)
            elif method == "gameOver":
                result = handle_game_over(state_ref)
            else:
                write_error(id_val, -32601, f"Unknown method: {method}")
                continue
            write_result(id_val, result)
        except RuntimeError as e:
            if "Not initialized" in str(e):
                write_error(id_val, -32002, str(e))
            else:
                log(str(e))
                write_error(id_val, -32603, str(e))
        except ValueError as e:
            log(str(e))
            write_error(id_val, -32602, str(e))
        except Exception as e:
            log(str(e))
            write_error(id_val, -32603, str(e))


if __name__ == "__main__":
    main()
