namespace DotsAndBoxes;

public readonly record struct Edge(Point A, Point B)
{
    public static Edge Normalized(Point p1, Point p2) =>
        p1.CompareTo(p2) <= 0 ? new Edge(p1, p2) : new Edge(p2, p1);

    public bool IsValid(int nx, int ny) =>
        A.InBounds(nx, ny) && B.InBounds(nx, ny) && A.Manhattan(B) == 1;
}
