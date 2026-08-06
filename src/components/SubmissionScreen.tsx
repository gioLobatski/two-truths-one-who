"use client";

import { useState } from "react";
import { Player, TRUTHS_PER_PLAYER, allTruthsSubmitted } from "@/lib/game";
import { Button, Card, Screen, Subtitle, Title } from "./ui";

export function SubmissionScreen({
  players,
  playerId,
  onSetTruths,
  onStartGame,
  isHost,
}: {
  players: Player[];
  playerId: string | null;
  onSetTruths: (playerId: string, truths: string[]) => void;
  onStartGame: () => void;
  isHost: boolean;
}) {
  const [draft, setDraft] = useState<string[]>(
    Array(TRUTHS_PER_PLAYER).fill(""),
  );
  const [submitted, setSubmitted] = useState(false);

  const currentPlayer = players.find((p) => p.id === playerId);
  const hasSubmitted = currentPlayer?.truths.some((t) => t.trim().length > 0);
  const done = allTruthsSubmitted(players);

  // Everyone has submitted — show the "start game" gate
  if (done) {
    return (
      <Screen>
        <Title>All truths locked in 🔒</Title>
        <Subtitle>The randomizer is ready!</Subtitle>
        <Card className="space-y-6 text-center">
          <p className="text-violet-100">
            {players.length} players · {players.length * TRUTHS_PER_PLAYER} truths
            shuffled and ready.
          </p>
          {isHost ? (
            <Button className="w-full" onClick={onStartGame}>
              Start the guessing
            </Button>
          ) : (
            <p className="text-sm text-violet-200/50">
              Waiting for the host to start...
            </p>
          )}
        </Card>
      </Screen>
    );
  }

  // Current player already submitted
  if (hasSubmitted || submitted) {
    return (
      <Screen>
        <Title>Truths submitted ✓</Title>
        <Card className="space-y-4 text-center">
          <p className="text-violet-100">
            Waiting for everyone else to submit their truths...
          </p>
          <p className="text-sm text-violet-200/50">
            {players.filter((p) => p.truths.some((t) => t.trim())).length} /{" "}
            {players.length} players ready
          </p>
        </Card>
      </Screen>
    );
  }

  const canSubmit = draft.every((t) => t.trim().length > 0);

  function submit() {
    if (!playerId) return;
    onSetTruths(playerId, draft);
    setSubmitted(true);
  }

  return (
    <Screen>
      <div className="space-y-2">
        <Title>Your Truths</Title>
        <Subtitle>
          Write {TRUTHS_PER_PLAYER} true things about you — vague enough that
          others can&apos;t easily tell it&apos;s you, but still true.
        </Subtitle>
      </div>

      <Card className="space-y-4">
        {draft.map((value, i) => (
          <div key={i} className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-violet-300/60">
              Truth {i + 1}
            </label>
            <textarea
              value={value}
              onChange={(e) =>
                setDraft((d) => d.map((v, j) => (j === i ? e.target.value : v)))
              }
              rows={2}
              maxLength={140}
              placeholder="Something true but hard to trace back to you…"
              className="w-full resize-none rounded-xl bg-black/30 px-4 py-3 text-white placeholder-violet-300/40 outline-none ring-1 ring-inset ring-white/10 focus:ring-violet-400"
            />
          </div>
        ))}

        <Button className="w-full" onClick={submit} disabled={!canSubmit}>
          Lock in my truths
        </Button>
      </Card>
    </Screen>
  );
}
