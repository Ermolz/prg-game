package dab;

import com.google.gson.Gson;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * JSON-RPC over stdin/stdout with Content-Length framing (LSP-style).
 * Input: "Content-Length: N\r\n\r\n" + N bytes UTF-8 JSON per request.
 * Output: same format per response. Logging only to stderr.
 */
public final class Cli {

    private static final String CONTENT_LENGTH_PREFIX = "Content-Length: ";
    private static final byte[] HEADER_END = "\r\n\r\n".getBytes(StandardCharsets.US_ASCII);
    private static final Gson GSON = new Gson();

    private static void log(String msg) {
        System.err.println("[cli] " + msg);
    }

    public static void main(String[] args) {
        InputStream in = System.in;
        OutputStream out = System.out;
        State[] stateRef = new State[1]; // ref for mutable state

        while (true) {
            int contentLength;
            try {
                contentLength = readContentLength(in);
            } catch (IOException e) {
                break;
            }
            if (contentLength < 0) break;

            byte[] bodyBytes;
            try {
                bodyBytes = readExactly(in, contentLength);
            } catch (IOException e) {
                break;
            }
            if (bodyBytes == null) break;

            String line = new String(bodyBytes, StandardCharsets.UTF_8);
            JsonElement idEl = null;
            String method = null;
            JsonObject params = null;

            try {
                JsonObject root = JsonParser.parseString(line).getAsJsonObject();
                if (root.has("id")) idEl = root.get("id");
                if (root.has("method")) method = root.get("method").getAsString();
                if (root.has("params") && root.get("params").isJsonObject())
                    params = root.get("params").getAsJsonObject();

                if (method == null || method.isEmpty()) {
                    writeError(out, idEl, -32600, "Invalid request: missing method");
                    continue;
                }

                Object result = switch (method) {
                    case "init" -> handleInit(params, stateRef);
                    case "applyMove" -> handleApplyMove(params, stateRef);
                    case "possibleMoves" -> handlePossibleMoves(stateRef);
                    case "botMove" -> handleBotMove(stateRef);
                    case "gameOver" -> handleGameOver(stateRef);
                    default -> throw new JsonRpcException(-32601, "Unknown method: " + method);
                };

                writeResult(out, idEl, result);
            } catch (JsonRpcException e) {
                writeError(out, idEl, e.code, e.message);
            } catch (Exception e) {
                log(e.toString());
                writeError(out, idEl, -32603, e.getMessage());
            }
        }
    }

    private static int readContentLength(InputStream in) throws IOException {
        List<Byte> buffer = new ArrayList<>();
        while (buffer.size() < 4 || !endsWith(buffer, HEADER_END)) {
            int b = in.read();
            if (b < 0) return -1;
            buffer.add((byte) b);
        }
        byte[] arr = new byte[buffer.size()];
        for (int i = 0; i < buffer.size(); i++) arr[i] = buffer.get(i);
        String header = new String(arr, StandardCharsets.US_ASCII);
        int idx = header.toLowerCase().indexOf("content-length:");
        if (idx < 0) return -1;
        idx += CONTENT_LENGTH_PREFIX.length();
        int end = header.indexOf("\r\n", idx);
        if (end < 0) return -1;
        String num = header.substring(idx, end).trim();
        try {
            return Integer.parseInt(num);
        } catch (NumberFormatException e) {
            return -1;
        }
    }

    private static boolean endsWith(List<Byte> list, byte[] suffix) {
        if (list.size() < suffix.length) return false;
        int start = list.size() - suffix.length;
        for (int i = 0; i < suffix.length; i++) {
            if (list.get(start + i) != suffix[i]) return false;
        }
        return true;
    }

    private static byte[] readExactly(InputStream in, int count) throws IOException {
        byte[] buf = new byte[count];
        int remaining = count;
        int offset = 0;
        while (remaining > 0) {
            int n = in.read(buf, offset, remaining);
            if (n <= 0) return null;
            offset += n;
            remaining -= n;
        }
        return buf;
    }

    private static void writeFrame(OutputStream out, String json) throws IOException {
        byte[] body = json.getBytes(StandardCharsets.UTF_8);
        String header = "Content-Length: " + body.length + "\r\n\r\n";
        out.write(header.getBytes(StandardCharsets.US_ASCII));
        out.write(body);
        out.flush();
    }

    private static void writeResult(OutputStream out, JsonElement id, Object result) {
        try {
            JsonObject obj = new JsonObject();
            obj.addProperty("jsonrpc", "2.0");
            obj.add("id", id != null ? id : com.google.gson.JsonNull.INSTANCE);
            obj.add("result", GSON.toJsonTree(result));
            writeFrame(out, GSON.toJson(obj));
        } catch (IOException e) {
            log("write error: " + e.getMessage());
        }
    }

    private static void writeError(OutputStream out, JsonElement id, int code, String message) {
        try {
            JsonObject err = new JsonObject();
            err.addProperty("code", code);
            err.addProperty("message", message);
            JsonObject obj = new JsonObject();
            obj.addProperty("jsonrpc", "2.0");
            obj.add("id", id != null ? id : com.google.gson.JsonNull.INSTANCE);
            obj.add("error", GSON.toJsonTree(err));
            writeFrame(out, GSON.toJson(obj));
        } catch (IOException e) {
            log("write error: " + e.getMessage());
        }
    }

    // --- Handlers ---

    private static Object handleInit(JsonObject params, State[] stateRef) {
        int nx = params != null && params.has("nx") ? params.get("nx").getAsInt() : 2;
        int ny = params != null && params.has("ny") ? params.get("ny").getAsInt() : 2;
        stateRef[0] = State.initial(nx, ny);
        return Map.of("state", stateToJson(stateRef[0]));
    }

    private static Object handleApplyMove(JsonObject params, State[] stateRef) {
        if (stateRef[0] == null) throw new JsonRpcException(-32002, "Not initialized");
        if (params == null || !params.has("edge")) throw new JsonRpcException(-32602, "Missing params");
        Edge edge = parseEdge(params.getAsJsonObject("edge"));
        Core.ApplyResult res = Core.applyMove(stateRef[0], edge);
        stateRef[0] = res.newState();
        List<Map<String, Integer>> closedBoxes = new ArrayList<>();
        for (int[] box : res.closedBoxes()) {
            closedBoxes.add(Map.of("x", box[0], "y", box[1]));
        }
        return Map.of(
            "state", stateToJson(res.newState()),
            "closedBoxes", closedBoxes,
            "extraTurn", res.extraTurn()
        );
    }

    private static Object handlePossibleMoves(State[] stateRef) {
        if (stateRef[0] == null) throw new JsonRpcException(-32002, "Not initialized");
        List<Edge> edges = Core.possibleMoves(stateRef[0]);
        List<Map<String, Object>> list = new ArrayList<>();
        for (Edge e : edges) list.add(edgeToMap(e));
        return Map.of("edges", list);
    }

    private static Object handleBotMove(State[] stateRef) {
        if (stateRef[0] == null) throw new JsonRpcException(-32002, "Not initialized");
        Bot.BotMove move = Bot.greedySafe(stateRef[0]);
        Core.ApplyResult res = Core.applyMove(stateRef[0], move.edge());
        stateRef[0] = res.newState();
        return Map.of(
            "move", edgeToMap(move.edge()),
            "reason", move.reason(),
            "state", stateToJson(res.newState())
        );
    }

    private static Object handleGameOver(State[] stateRef) {
        if (stateRef[0] == null) throw new JsonRpcException(-32002, "Not initialized");
        return Map.of("gameOver", Core.gameOver(stateRef[0]));
    }

    private static Map<String, Object> stateToJson(State s) {
        List<Map<String, Object>> edgesList = new ArrayList<>();
        List<Edge> sorted = new ArrayList<>(s.edges());
        sorted.sort((e1, e2) -> {
            int c = Integer.compare(e1.a().x(), e2.a().x());
            if (c != 0) return c;
            c = Integer.compare(e1.a().y(), e2.a().y());
            if (c != 0) return c;
            c = Integer.compare(e1.b().x(), e2.b().x());
            if (c != 0) return c;
            return Integer.compare(e1.b().y(), e2.b().y());
        });
        for (Edge e : sorted) edgesList.add(edgeToMap(e));
        return Map.of(
            "nx", s.nx(),
            "ny", s.ny(),
            "edges", edgesList,
            "s1", s.s1(),
            "s2", s.s2(),
            "player", s.player()
        );
    }

    private static Map<String, Object> edgeToMap(Edge e) {
        return Map.of(
            "a", Map.of("x", e.a().x(), "y", e.a().y()),
            "b", Map.of("x", e.b().x(), "y", e.b().y())
        );
    }

    private static Edge parseEdge(JsonObject el) {
        JsonObject a = el.getAsJsonObject("a");
        JsonObject b = el.getAsJsonObject("b");
        Point p1 = new Point(a.get("x").getAsInt(), a.get("y").getAsInt());
        Point p2 = new Point(b.get("x").getAsInt(), b.get("y").getAsInt());
        return Edge.normalized(p1, p2);
    }

    private static class JsonRpcException extends RuntimeException {
        final int code;
        final String message;

        JsonRpcException(int code, String message) {
            super(message);
            this.code = code;
            this.message = message;
        }
    }
}
