"use client";

import { Player } from "@/lib/game";
import { Button, Card, Screen, Subtitle, Title } from "./ui";

export function GameOverScreen({
  players,
  onPlayAgain,
}: {
  players: Player[];
  onPlayAgain: () => void;
}) {
  const ranked = [...players].sort((a, b) => b.score - a.score);
  const topScore = ranked[0]?.score ?? 0;
  const winners = ranked.filter((p) => p.score === topScore && topScore > 0);

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <Screen>
      <div className="space-y-2">
        <Subtitle>Game over</Subtitle>
        <Title>
          {winners.length === 1
            ? `${winners[0].name} wins! 🎉`
            : winners.length > 1
              ? "It's a tie! 🎉"
              : "Final scores"}
        </Title>
      </div>

      <Card className="space-y-3">
        {ranked.map((p, i) => (
          <div
            key={p.id}
            className="flex items-center justify-between rounded-xl bg-black/20 px-4 py-3 ring-1 ring-inset ring-white/5"
          >
            <span className="flex items-center gap-3 font-medium text-white">
              <span className="w-6 text-center">{medals[i] ?? i + 1}</span>
              {p.name}
            </span>
            <span className="font-black text-amber-400">{p.score}</span>
          </div>
        ))}

        <Button className="mt-2 w-full" onClick={onPlayAgain}>
          Play again
        </Button>
      </Card>
    </Screen>
  );
}
