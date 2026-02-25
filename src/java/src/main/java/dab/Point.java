package dab;

public record Point(int x, int y) {
    public boolean inBounds(int nx, int ny) {
        return x >= 0 && x <= nx && y >= 0 && y <= ny;
    }

    public int manhattan(Point other) {
        return Math.abs(x - other.x) + Math.abs(y - other.y);
    }
}
