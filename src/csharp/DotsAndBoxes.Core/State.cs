namespace DotsAndBoxes;

public sealed record State(int NX, int NY, HashSet<Edge> Edges, int S1, int S2, int Player)
{
    public static State Initial(int nx, int ny)
    {
        if (nx < 1 || ny < 1) throw new ArgumentException("nx, ny >= 1");
        return new State(nx, ny, new HashSet<Edge>(), 0, 0, 1);
    }

    public State WithMoveApplied(Edge e, int addS1, int addS2, int nextPlayer)
    {
        var next = new HashSet<Edge>(Edges) { Edge.Normalized(e.A, e.B) };
        return new State(NX, NY, next, S1 + addS1, S2 + addS2, nextPlayer);
    }
}
