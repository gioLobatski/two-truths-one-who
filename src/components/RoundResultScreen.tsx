"use client";

import { Player, Round, scoreRound } from "@/lib/game";
import { Button, Card, Screen, Subtitle, Title } from "./ui";

export function RoundResultScreen({
  round,
  players,
  isLastRound,
  onNext,
  isHost,
  authorAppearance,
}: {
  round: Round;
  players: Player[];
  isLastRound: boolean;
  onNext: () => void;
  isHost: boolean;
  authorAppearance: number;
}) {
  const byId = (id: string) => players.find((p) => p.id === id);
  const author = byId(round.authorId);
  const lines = scoreRound(round, authorAppearance);

  const guessEntries = Object.entries(round.guesses).filter(
    ([guesserId]) => guesserId !== round.authorId,
  );

  return (
    <Screen>
      <div className="space-y-2">
        <Subtitle>The truth belonged to…</Subtitle>
        <Title>{author?.name ?? "Unknown"} 🎭</Title>
      </div>

      <Card className="space-y-6">
        <blockquote className="rounded-2xl bg-black/30 px-6 py-5 text-center text-lg font-medium text-white ring-1 ring-inset ring-white/10">
          &ldquo;{round.truth}&rdquo;
        </blockquote>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-cyan-200/70">
            Guesses
          </p>
          {guessEntries.map(([guesserId, guessedId]) => {
            const correct = guessedId === round.authorId;
            return (
              <div
                key={guesserId}
                className="flex items-center justify-between rounded-xl bg-black/20 px-4 py-2 text-sm"
              >
                <span className="text-white">{byId(guesserId)?.name}</span>
                <span className={correct ? "text-emerald-300" : "text-rose-300/80"}>
                  {correct ? "✓ correct" : `guessed ${byId(guessedId)?.name}`}
                </span>
              </div>
            );
          })}
        </div>

        <div className="space-y-2 border-t border-white/10 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-cyan-200/70">
            Points this round
          </p>
          {lines.length === 0 ? (
            <p className="text-sm text-slate-300/60">
              No points awarded this round.
            </p>
          ) : (
            lines.map((line, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-white">
                  <span className="font-semibold">
                    {byId(line.playerId)?.name}
                  </span>{" "}
                  — {line.reason}
                </span>
                <span className="font-bold text-emerald-300">
                  +{line.points}
                </span>
              </div>
            ))
          )}
        </div>

        {isHost ? (
          <Button className="w-full" onClick={onNext}>
            {isLastRound ? "See final scores" : "Next round"}
          </Button>
        ) : (
          <p className="text-center text-sm text-slate-300/60">
            Waiting for the host to continue...
          </p>
        )}
      </Card>
    </Screen>
  );
}
