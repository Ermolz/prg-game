namespace DotsAndBoxes;

public readonly record struct Point(int X, int Y) : IComparable<Point>
{
    public bool InBounds(int nx, int ny) => X >= 0 && X <= nx && Y >= 0 && Y <= ny;

    public int Manhattan(Point other) => Math.Abs(X - other.X) + Math.Abs(Y - other.Y);

    public int CompareTo(Point other)
    {
        var c = X.CompareTo(other.X);
        return c != 0 ? c : Y.CompareTo(other.Y);
    }
}
