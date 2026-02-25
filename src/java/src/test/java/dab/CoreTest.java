package dab;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class CoreTest {

    @Test
    void totalEdges2x2is12() {
        assertEquals(12, Core.totalEdges(2, 2));
    }

    @Test
    void possibleMovesEmpty2x2is12() {
        State s = State.initial(2, 2);
        assertEquals(12, Core.possibleMoves(s).size());
    }

    @Test
    void repeatEdgeForbidden() {
        State s = State.initial(2, 2);
        Edge e = Core.possibleMoves(s).get(0);
        Core.ApplyResult r = Core.applyMove(s, e);
        assertThrows(IllegalArgumentException.class, () -> Core.applyMove(r.newState(), e));
    }

    @Test
    void closeOneBox1x1extraTurn() {
        State s = State.initial(1, 1);
        s = Core.applyMove(s, Edge.normalized(new Point(0, 0), new Point(1, 0))).newState();
        s = Core.applyMove(s, Edge.normalized(new Point(0, 0), new Point(0, 1))).newState();
        s = Core.applyMove(s, Edge.normalized(new Point(1, 0), new Point(1, 1))).newState();
        Core.ApplyResult r = Core.applyMove(s, Edge.normalized(new Point(0, 1), new Point(1, 1)));
        assertEquals(1, r.closedBoxes().size());
        assertTrue(r.extraTurn());
    }

    @Test
    void closeTwoBoxesOneEdge2x1() {
        State s = State.initial(2, 1);
        for (Edge e : List.of(
            Edge.normalized(new Point(0, 0), new Point(1, 0)),
            Edge.normalized(new Point(0, 0), new Point(0, 1)),
            Edge.normalized(new Point(0, 1), new Point(1, 1)),
            Edge.normalized(new Point(1, 0), new Point(2, 0)),
            Edge.normalized(new Point(1, 1), new Point(2, 1))
        )) {
            s = Core.applyMove(s, e).newState();
        }
        Core.ApplyResult r = Core.applyMove(s, Edge.normalized(new Point(1, 0), new Point(1, 1)));
        assertTrue(r.closedBoxes().size() >= 1);
        assertTrue(r.extraTurn());
    }

    @Test
    void extraTurnPlayerUnchanged() {
        State s = State.initial(1, 1);
        for (Edge e : List.of(
            Edge.normalized(new Point(0, 0), new Point(1, 0)),
            Edge.normalized(new Point(0, 0), new Point(0, 1)),
            Edge.normalized(new Point(1, 0), new Point(1, 1)),
            Edge.normalized(new Point(0, 1), new Point(1, 1))
        )) {
            s = Core.applyMove(s, e).newState();
        }
        assertEquals(2, s.player());
    }

    @Test
    void noClosePlayerChanges() {
        State s = State.initial(2, 2);
        Core.ApplyResult r = Core.applyMove(s, Edge.normalized(new Point(0, 0), new Point(1, 0)));
        assertTrue(r.closedBoxes().isEmpty());
        assertFalse(r.extraTurn());
        assertEquals(2, r.newState().player());
    }

    @Test
    void botDeterministicOnEmpty() {
        State s = State.initial(2, 2);
        Bot.BotMove m1 = Bot.greedySafe(s);
        Bot.BotMove m2 = Bot.greedySafe(s);
        assertEquals(m1.edge(), m2.edge());
    }
}
