package dab;

import java.util.Comparator;
import java.util.List;

public final class Bot {

    private Bot() {}

    public static BotMove greedySafe(State s) {
        if (Core.gameOver(s)) throw new IllegalStateException("game over");
        List<Edge> moves = Core.possibleMoves(s);
        if (moves.isEmpty()) throw new IllegalStateException("no moves");
        int bestClosed = -1;
        int bestRisk = Integer.MAX_VALUE;
        Edge bestEdge = moves.get(0);
        for (Edge e : moves) {
            var res = Core.applyMove(s, e);
            int closed = res.closedBoxes().size();
            int risk = thirdSideRisk(s, e);
            if (closed > bestClosed
                || (closed == bestClosed && risk < bestRisk)
                || (closed == bestClosed && risk == bestRisk && compareEdge(e, bestEdge) < 0)) {
                bestClosed = closed;
                bestRisk = risk;
                bestEdge = e;
            }
        }
        String reason = bestClosed >= 2 ? "greedy_close_2"
            : bestClosed == 1 ? "greedy_close_1"
            : bestRisk == 0 ? "safe_no_third_side"
            : "fallback_min_risk";
        return new BotMove(bestEdge, reason);
    }

    public static int thirdSideRisk(State s, Edge e) {
        var with = new java.util.HashSet<>(s.edges());
        with.add(Edge.normalized(e.a(), e.b()));
        int count = 0;
        for (int[] box : Core.adjacentBoxesForEdge(s.nx(), s.ny(), e)) {
            var be = Core.boxEdges(box[0], box[1]);
            long three = be.stream().filter(with::contains).count();
            if (three == 3) count++;
        }
        return count;
    }

    private static int compareEdge(Edge a, Edge b) {
        int c = Integer.compare(a.a().x(), b.a().x());
        if (c != 0) return c;
        c = Integer.compare(a.a().y(), b.a().y());
        if (c != 0) return c;
        c = Integer.compare(a.b().x(), b.b().x());
        if (c != 0) return c;
        return Integer.compare(a.b().y(), b.b().y());
    }

    public record BotMove(Edge edge, String reason) {}
}
