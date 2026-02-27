using System.Linq;
namespace DotsAndBoxes;

public static class Bot
{
    public static BotMove GreedySafe(State s)
    {
        if (Core.GameOver(s)) throw new InvalidOperationException("game over");
        var moves = Core.PossibleMoves(s);
        if (moves.Count == 0) throw new InvalidOperationException("no moves");
        int bestClosed = -1, bestRisk = int.MaxValue;
        Edge bestEdge = moves[0];
        foreach (var e in moves)
        {
            var res = Core.ApplyMove(s, e);
            int closed = res.Closed.Count;
            int risk = ThirdSideRisk(s, e);
            if (closed > bestClosed
                || (closed == bestClosed && risk < bestRisk)
                || (closed == bestClosed && risk == bestRisk && CompareEdge(e, bestEdge) < 0))
            {
                bestClosed = closed;
                bestRisk = risk;
                bestEdge = e;
            }
        }
        string reason = bestClosed >= 2 ? "greedy_close_2"
            : bestClosed == 1 ? "greedy_close_1"
            : bestRisk == 0 ? "safe_no_third_side"
            : "fallback_min_risk";
        return new BotMove(bestEdge, reason);
    }

    public static int ThirdSideRisk(State s, Edge e)
    {
        var with = new HashSet<Edge>(s.Edges) { Edge.Normalized(e.A, e.B) };
        int count = 0;
        foreach (var (x, y) in Core.AdjacentBoxesForEdge(s.NX, s.NY, e))
            if (Core.BoxEdges(x, y).Count(be => with.Contains(be)) == 3) count++;
        return count;
    }

    static int CompareEdge(Edge a, Edge b)
    {
        var c = a.A.CompareTo(b.A);
        if (c != 0) return c;
        return a.B.CompareTo(b.B);
    }

    public sealed record BotMove(Edge Edge, string Reason);
}
