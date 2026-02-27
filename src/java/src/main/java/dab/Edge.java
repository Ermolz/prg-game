package dab;

import java.util.Comparator;

public record Edge(Point a, Point b) {
    public static Edge normalized(Point p1, Point p2) {
        int c = comparePoints(p1, p2);
        return c <= 0 ? new Edge(p1, p2) : new Edge(p2, p1);
    }

    private static int comparePoints(Point p1, Point p2) {
        if (p1.x() != p2.x()) return Integer.compare(p1.x(), p2.x());
        return Integer.compare(p1.y(), p2.y());
    }

    public boolean isValid(int nx, int ny) {
        return a.inBounds(nx, ny) && b.inBounds(nx, ny) && a.manhattan(b) == 1;
    }
}
