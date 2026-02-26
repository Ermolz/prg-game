using System.Buffers;
using System.Text;
using System.Text.Json;
using DotsAndBoxes;

// JSON-RPC over stdin/stdout with Content-Length framing (LSP-style).
// Input: "Content-Length: N\r\n\r\n" + N bytes UTF-8 JSON per request.
// Output: same format per response. Logging only to stderr.
using var stdin = Console.OpenStandardInput();
using var stdout = Console.OpenStandardOutput();

static void Log(string msg) => Console.Error.WriteLine($"[cli] {msg}");

State? state = null;
var readBuffer = new List<byte>(4096);

while (true)
{
    int contentLength = await ReadContentLengthAsync(stdin, readBuffer);
    if (contentLength < 0) break;

    var body = await ReadExactlyAsync(stdin, contentLength, readBuffer);
    if (body == null) break;

    string line = Encoding.UTF8.GetString(body);
    JsonElement? id = null;
    string? method = null;
    JsonElement? @params = null;

    try
    {
        using var doc = JsonDocument.Parse(line);
        var root = doc.RootElement;
        if (root.TryGetProperty("id", out var idProp)) id = idProp.Clone();
        if (root.TryGetProperty("method", out var m)) method = m.GetString();
        if (root.TryGetProperty("params", out var p)) @params = p.Clone();

        if (string.IsNullOrEmpty(method))
        {
            await WriteError(stdout, id, -32600, "Invalid request: missing method");
            continue;
        }

        object? result = method switch
        {
            "init" => HandleInit(@params, ref state),
            "getState" => HandleGetState(state),
            "applyMove" => HandleApplyMove(@params, ref state),
            "possibleMoves" => HandlePossibleMoves(state),
            "botMove" => HandleBotMove(ref state),
            "gameOver" => HandleGameOver(state),
            _ => throw new JsonRpcException(-32601, $"Unknown method: {method}")
        };

        if (result is JsonRpcError err)
            await WriteError(stdout, id, err.Code, err.Message);
        else
            await WriteResult(stdout, id, result!);
    }
    catch (JsonRpcException ex)
    {
        await WriteError(stdout, id, ex.Code, ex.Message);
    }
    catch (Exception ex)
    {
        Log(ex.ToString());
        await WriteError(stdout, id, -32603, ex.Message);
    }
}

const string ContentLengthPrefix = "Content-Length: ";

static async Task<int> ReadContentLengthAsync(Stream stream, List<byte> buffer)
{
    byte[] headerEnd = Encoding.ASCII.GetBytes("\r\n\r\n");
    buffer.Clear();
    var one = ArrayPool<byte>.Shared.Rent(1);
    try
    {
        while (buffer.Count < 4 || !EndsWith(buffer, headerEnd))
        {
            int n = await stream.ReadAsync(one.AsMemory(0, 1));
            if (n == 0) return -1;
            buffer.Add(one[0]);
        }

        string header = Encoding.ASCII.GetString(buffer.ToArray());
        int idx = header.IndexOf(ContentLengthPrefix, StringComparison.OrdinalIgnoreCase);
        if (idx < 0) return -1;
        idx += ContentLengthPrefix.Length;
        int end = header.IndexOf("\r\n", idx, StringComparison.Ordinal);
        if (end < 0) return -1;
        string num = header.Substring(idx, end - idx).Trim();
        return int.TryParse(num, out int len) ? len : -1;
    }
    finally
    {
        ArrayPool<byte>.Shared.Return(one);
    }
}

static bool EndsWith(List<byte> list, byte[] suffix)
{
    if (list.Count < suffix.Length) return false;
    for (int i = 0; i < suffix.Length; i++)
        if (list[list.Count - suffix.Length + i] != suffix[i]) return false;
    return true;
}

static async Task<byte[]?> ReadExactlyAsync(Stream stream, int count, List<byte> reuse)
{
    reuse.Clear();
    var buf = ArrayPool<byte>.Shared.Rent(Math.Min(4096, count));
    try
    {
        int remaining = count;
        while (remaining > 0)
        {
            int toRead = Math.Min(remaining, buf.Length);
            int n = await stream.ReadAsync(buf.AsMemory(0, toRead));
            if (n == 0) return null;
            for (int i = 0; i < n; i++) reuse.Add(buf[i]);
            remaining -= n;
        }
        return reuse.ToArray();
    }
    finally
    {
        ArrayPool<byte>.Shared.Return(buf);
    }
}

static async Task WriteResult(Stream w, JsonElement? id, object result)
{
    var obj = new Dictionary<string, object?> { ["jsonrpc"] = "2.0", ["id"] = id, ["result"] = result };
    var json = JsonSerializer.Serialize(obj, GetJsonOptions());
    await WriteFrameAsync(w, json);
}

static async Task WriteError(Stream w, JsonElement? id, int code, string message)
{
    var err = new Dictionary<string, object> { ["code"] = code, ["message"] = message };
    var obj = new Dictionary<string, object?> { ["jsonrpc"] = "2.0", ["id"] = id, ["error"] = err };
    var json = JsonSerializer.Serialize(obj, GetJsonOptions());
    await WriteFrameAsync(w, json);
}

static async Task WriteFrameAsync(Stream w, string json)
{
    byte[] body = Encoding.UTF8.GetBytes(json);
    string header = $"Content-Length: {body.Length}\r\n\r\n";
    byte[] headerBytes = Encoding.ASCII.GetBytes(header);
    await w.WriteAsync(headerBytes);
    await w.WriteAsync(body);
    await w.FlushAsync();
}

static object HandleInit(JsonElement? p, ref State? s)
{
    int nx = p?.GetProperty("nx").GetInt32() ?? 2;
    int ny = p?.GetProperty("ny").GetInt32() ?? 2;
    s = State.Initial(nx, ny);
    return new { state = StateToJson(s) };
}

static object HandleGetState(State? s)
{
    if (s == null) throw new JsonRpcException(-32002, "Not initialized");
    return new { state = StateToJson(s) };
}

static object HandleApplyMove(JsonElement? p, ref State? s)
{
    if (s == null) throw new JsonRpcException(-32002, "Not initialized");
    if (p == null) throw new JsonRpcException(-32602, "Missing params");
    var edge = ParseEdge(p.Value.GetProperty("edge"));
    var res = Core.ApplyMove(s, edge);
    s = res.NewState;
    return new
    {
        state = StateToJson(s),
        closedBoxes = res.Closed.Select(c => new { x = c.x, y = c.y }).ToList(),
        extraTurn = res.ExtraTurn
    };
}

static object HandlePossibleMoves(State? s)
{
    if (s == null) throw new JsonRpcException(-32002, "Not initialized");
    var edges = Core.PossibleMoves(s);
    return new { edges = edges.Select(EdgeToJson).ToList() };
}

static object HandleBotMove(ref State? s)
{
    if (s == null) throw new JsonRpcException(-32002, "Not initialized");
    var move = Bot.GreedySafe(s);
    s = Core.ApplyMove(s, move.Edge).NewState;
    return new { move = EdgeToJson(move.Edge), reason = move.Reason, state = StateToJson(s) };
}

static object HandleGameOver(State? s)
{
    if (s == null) throw new JsonRpcException(-32002, "Not initialized");
    return new { gameOver = Core.GameOver(s) };
}

static object StateToJson(State s) => new
{
    nx = s.NX,
    ny = s.NY,
    edges = s.Edges.Select(EdgeToJson).ToList(),
    s1 = s.S1,
    s2 = s.S2,
    player = s.Player
};

static object EdgeToJson(Edge e) => new { a = new { x = e.A.X, y = e.A.Y }, b = new { x = e.B.X, y = e.B.Y } };

static Edge ParseEdge(JsonElement el)
{
    var a = el.GetProperty("a");
    var b = el.GetProperty("b");
    var p1 = new Point(a.GetProperty("x").GetInt32(), a.GetProperty("y").GetInt32());
    var p2 = new Point(b.GetProperty("x").GetInt32(), b.GetProperty("y").GetInt32());
    return Edge.Normalized(p1, p2);
}

static JsonSerializerOptions GetJsonOptions() => new()
{
    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    WriteIndented = false
};

class JsonRpcException(int code, string message) : Exception(message)
{
    public int Code => code;
}

struct JsonRpcError(int code, string message)
{
    public int Code => code;
    public string Message => message;
}
