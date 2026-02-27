namespace DotsAndBoxes;

public static class Core
{
    public static int TotalEdges(int nx, int ny) => nx * (ny + 1) + (nx + 1) * ny;

    public static List<Edge> PossibleMoves(State s)
    {
        var out_ = new List<Edge>();
        for (int x = 0; x < s.NX; x++)
            for (int y = 0; y <= s.NY; y++)
            {
                var e = Edge.Normalized(new Point(x, y), new Point(x + 1, y));
                if (!s.Edges.Contains(e)) out_.Add(e);
            }
        for (int x = 0; x <= s.NX; x++)
            for (int y = 0; y < s.NY; y++)
            {
                var e = Edge.Normalized(new Point(x, y), new Point(x, y + 1));
                if (!s.Edges.Contains(e)) out_.Add(e);
            }
        out_.Sort((a, b) =>
        {
            var c = a.A.CompareTo(b.A);
            return c != 0 ? c : a.B.CompareTo(b.B);
        });
        return out_;
    }

    public static List<(int x, int y)> AdjacentBoxesForEdge(int nx, int ny, Edge e)
    {
        var out_ = new List<(int, int)>();
        int minX = Math.Min(e.A.X, e.B.X), minY = Math.Min(e.A.Y, e.B.Y);
        if (e.A.Y == e.B.Y)
        {
            foreach (int yy in new[] { minY, minY - 1 })
                if (yy >= 0 && yy < ny && minX >= 0 && minX < nx) out_.Add((minX, yy));
        }
        else
        {
            foreach (int xx in new[] { minX, minX - 1 })
                if (xx >= 0 && xx < nx && minY >= 0 && minY < ny) out_.Add((xx, minY));
        }
        return out_;
    }

    public static List<Edge> BoxEdges(int x, int y)
    {
        var p00 = new Point(x, y);
        var p10 = new Point(x + 1, y);
        var p01 = new Point(x, y + 1);
        var p11 = new Point(x + 1, y + 1);
        return new List<Edge>
        {
            Edge.Normalized(p00, p10),
            Edge.Normalized(p00, p01),
            Edge.Normalized(p10, p11),
            Edge.Normalized(p01, p11)
        };
    }

    public static List<(int x, int y)> CompletedBoxesByEdge(State s, Edge edge)
    {
        var with = new HashSet<Edge>(s.Edges) { Edge.Normalized(edge.A, edge.B) };
        var closed = new List<(int, int)>();
        foreach (var (xx, yy) in AdjacentBoxesForEdge(s.NX, s.NY, edge))
            if (BoxEdges(xx, yy).TrueForAll(with.Contains))
                closed.Add((xx, yy));
        return closed;
    }

    public static ApplyResult ApplyMove(State s, Edge move)
    {
        var norm = Edge.Normalized(move.A, move.B);
        if (s.Edges.Contains(norm)) throw new ArgumentException("edge already present");
        if (!norm.IsValid(s.NX, s.NY)) throw new ArgumentException("invalid edge");
        var sWith = s.WithMoveApplied(norm, 0, 0, s.Player);
        var closed = CompletedBoxesByEdge(sWith, norm);
        int n = closed.Count;
        if (n == 0)
        {
            int next = s.Player == 1 ? 2 : 1;
            return new ApplyResult(s.WithMoveApplied(norm, 0, 0, next), new List<(int, int)>(), false);
        }
        if (s.Player == 1)
            return new ApplyResult(s.WithMoveApplied(norm, n, 0, s.Player), closed, true);
        return new ApplyResult(s.WithMoveApplied(norm, 0, n, s.Player), closed, true);
    }

    public static bool GameOver(State s) => s.Edges.Count == TotalEdges(s.NX, s.NY);

    public record ApplyResult(State NewState, List<(int x, int y)> Closed, bool ExtraTurn);
}
