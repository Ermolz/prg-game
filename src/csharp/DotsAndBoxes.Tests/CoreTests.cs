using DotsAndBoxes;
using Xunit;

namespace DotsAndBoxes.Tests;

public class CoreTests
{
    [Fact]
    public void TotalEdges2x2is12() =>
        Assert.Equal(12, Core.TotalEdges(2, 2));

    [Fact]
    public void PossibleMovesEmpty2x2is12()
    {
        var s = State.Initial(2, 2);
        Assert.Equal(12, Core.PossibleMoves(s).Count);
    }

    [Fact]
    public void RepeatEdgeThrows()
    {
        var s = State.Initial(2, 2);
        var e = Core.PossibleMoves(s)[0];
        var r = Core.ApplyMove(s, e);
        Assert.Throws<ArgumentException>(() => Core.ApplyMove(r.NewState, e));
    }

    [Fact]
    public void CloseOneBox1x1ExtraTurn()
    {
        var s = State.Initial(1, 1);
        s = Core.ApplyMove(s, Edge.Normalized(new Point(0, 0), new Point(1, 0))).NewState;
        s = Core.ApplyMove(s, Edge.Normalized(new Point(0, 0), new Point(0, 1))).NewState;
        s = Core.ApplyMove(s, Edge.Normalized(new Point(1, 0), new Point(1, 1))).NewState;
        var r = Core.ApplyMove(s, Edge.Normalized(new Point(0, 1), new Point(1, 1)));
        Assert.Single(r.Closed);
        Assert.True(r.ExtraTurn);
    }

    [Fact]
    public void CloseTwoBoxesOneEdge2x1()
    {
        var s = State.Initial(2, 1);
        foreach (var e in new[] {
            Edge.Normalized(new Point(0, 0), new Point(1, 0)),
            Edge.Normalized(new Point(0, 0), new Point(0, 1)),
            Edge.Normalized(new Point(0, 1), new Point(1, 1)),
            Edge.Normalized(new Point(1, 0), new Point(2, 0)),
            Edge.Normalized(new Point(1, 1), new Point(2, 1))
        })
            s = Core.ApplyMove(s, e).NewState;
        var r = Core.ApplyMove(s, Edge.Normalized(new Point(1, 0), new Point(1, 1)));
        Assert.True(r.Closed.Count >= 1);
        Assert.True(r.ExtraTurn);
    }

    [Fact]
    public void ExtraTurnKeepsPlayer()
    {
        var s = State.Initial(1, 1);
        var prevPlayer = s.Player;
        foreach (var e in new[] {
            Edge.Normalized(new Point(0, 0), new Point(1, 0)),
            Edge.Normalized(new Point(0, 0), new Point(0, 1)),
            Edge.Normalized(new Point(1, 0), new Point(1, 1)),
            Edge.Normalized(new Point(0, 1), new Point(1, 1))
        })
        {
            var r = Core.ApplyMove(s, e);
            if (r.ExtraTurn) Assert.Equal(prevPlayer, r.NewState.Player);
            s = r.NewState;
            prevPlayer = s.Player;
        }
    }

    [Fact]
    public void NoCloseChangesPlayer()
    {
        var s = State.Initial(2, 2);
        var r = Core.ApplyMove(s, Edge.Normalized(new Point(0, 0), new Point(1, 0)));
        Assert.Empty(r.Closed);
        Assert.False(r.ExtraTurn);
        Assert.Equal(2, r.NewState.Player);
    }

    [Fact]
    public void BotDeterministicOnEmpty()
    {
        var s = State.Initial(2, 2);
        var m1 = Bot.GreedySafe(s);
        var m2 = Bot.GreedySafe(s);
        Assert.Equal(m1.Edge, m2.Edge);
    }
}
