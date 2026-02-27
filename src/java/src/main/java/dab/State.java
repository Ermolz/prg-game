package dab;

import java.util.HashSet;
import java.util.Set;

public record State(int nx, int ny, Set<Edge> edges, int s1, int s2, int player) {
    public static State initial(int nx, int ny) {
        if (nx < 1 || ny < 1) throw new IllegalArgumentException("nx, ny >= 1");
        return new State(nx, ny, new HashSet<>(), 0, 0, 1);
    }

    public State withMoveApplied(Edge e, int addS1, int addS2, int nextPlayer) {
        Set<Edge> next = new HashSet<>(edges);
        next.add(Edge.normalized(e.a(), e.b()));
        return new State(nx, ny, next, s1 + addS1, s2 + addS2, nextPlayer);
    }
}
