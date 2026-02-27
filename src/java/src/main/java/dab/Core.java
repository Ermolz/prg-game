package dab;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public final class Core {

    private Core() {}

    public static int totalEdges(int nx, int ny) {
        return nx * (ny + 1) + (nx + 1) * ny;
    }

    public static List<Edge> possibleMoves(State s) {
        List<Edge> out = new ArrayList<>();
        for (int x = 0; x < s.nx(); x++) {
            for (int y = 0; y <= s.ny(); y++) {
                Edge e = Edge.normalized(new Point(x, y), new Point(x + 1, y));
                if (!s.edges().contains(e)) out.add(e);
            }
        }
        for (int x = 0; x <= s.nx(); x++) {
            for (int y = 0; y < s.ny(); y++) {
                Edge e = Edge.normalized(new Point(x, y), new Point(x, y + 1));
                if (!s.edges().contains(e)) out.add(e);
            }
        }
        Collections.sort(out, (e1, e2) -> {
            int c = Integer.compare(e1.a().x(), e2.a().x());
            if (c != 0) return c;
            c = Integer.compare(e1.a().y(), e2.a().y());
            if (c != 0) return c;
            c = Integer.compare(e1.b().x(), e2.b().x());
            if (c != 0) return c;
            return Integer.compare(e1.b().y(), e2.b().y());
        });
        return out;
    }

    public static List<int[]> adjacentBoxesForEdge(int nx, int ny, Edge e) {
        List<int[]> out = new ArrayList<>();
        Point a = e.a(), b = e.b();
        int minX = Math.min(a.x(), b.x());
        int minY = Math.min(a.y(), b.y());
        if (a.y() == b.y()) {
            for (int yy : new int[] { minY, minY - 1 }) {
                if (yy >= 0 && yy < ny && minX >= 0 && minX < nx)
                    out.add(new int[] { minX, yy });
            }
        } else {
            for (int xx : new int[] { minX, minX - 1 }) {
                if (xx >= 0 && xx < nx && minY >= 0 && minY < ny)
                    out.add(new int[] { xx, minY });
            }
        }
        return out;
    }

    public static List<Edge> boxEdges(int x, int y) {
        Point p00 = new Point(x, y);
        Point p10 = new Point(x + 1, y);
        Point p01 = new Point(x, y + 1);
        Point p11 = new Point(x + 1, y + 1);
        return List.of(
            Edge.normalized(p00, p10),
            Edge.normalized(p00, p01),
            Edge.normalized(p10, p11),
            Edge.normalized(p01, p11)
        );
    }

    public static List<int[]> completedBoxesByEdge(State s, Edge edge) {
        Set<Edge> with = new HashSet<>(s.edges());
        with.add(Edge.normalized(edge.a(), edge.b()));
        List<int[]> closed = new ArrayList<>();
        for (int[] box : adjacentBoxesForEdge(s.nx(), s.ny(), edge)) {
            List<Edge> be = boxEdges(box[0], box[1]);
            if (with.containsAll(be)) closed.add(box);
        }
        return closed;
    }

    public static ApplyResult applyMove(State s, Edge move) {
        Edge norm = Edge.normalized(move.a(), move.b());
        if (s.edges().contains(norm))
            throw new IllegalArgumentException("edge already present");
        if (!norm.isValid(s.nx(), s.ny()))
            throw new IllegalArgumentException("invalid edge");
        List<int[]> closed = completedBoxesByEdge(
            s.withMoveApplied(norm, 0, 0, s.player()),
            norm
        );
        int n = closed.size();
        if (n == 0) {
            int next = s.player() == 1 ? 2 : 1;
            return new ApplyResult(
                s.withMoveApplied(norm, 0, 0, next),
                List.of(),
                false
            );
        }
        if (s.player() == 1)
            return new ApplyResult(
                s.withMoveApplied(norm, n, 0, s.player()),
                closed,
                true
            );
        return new ApplyResult(
            s.withMoveApplied(norm, 0, n, s.player()),
            closed,
            true
        );
    }

    public static boolean gameOver(State s) {
        return s.edges().size() == totalEdges(s.nx(), s.ny());
    }

    public record ApplyResult(State newState, List<int[]> closedBoxes, boolean extraTurn) {}
}
