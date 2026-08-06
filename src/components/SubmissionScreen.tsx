"use client";

import { useState } from "react";
import { Player, TRUTHS_PER_PLAYER, allTruthsSubmitted, maxRounds } from "@/lib/game";
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
  onStartGame: (roundCount: number) => void;
  isHost: boolean;
}) {
  const [draft, setDraft] = useState<string[]>(
    Array(TRUTHS_PER_PLAYER).fill(""),
  );
  const [submitted, setSubmitted] = useState(false);

  // Host picks the deck size — capped at 75% of all truths so the game ends
  // before every truth appears (keeps elimination-style deduction impossible)
  const totalTruths = players.length * TRUTHS_PER_PLAYER;
  const roundCap = maxRounds(players.length);
  const [roundCount, setRoundCount] = useState(roundCap);
  const minRounds = Math.min(2, roundCap);

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
          <p className="text-white">
            {players.length} players · {totalTruths} truths in the deck.
          </p>

          {isHost ? (
            <>
              {/* Deck size picker — the deck is shuffled and cut, so nobody
                  can track whose truths have already appeared */}
              <div className="rounded-xl bg-black/30 px-4 py-4 ring-1 ring-inset ring-white/10">
                <p className="text-xs font-semibold uppercase tracking-wide text-cyan-200/70">
                  Rounds to play
                </p>
                <div className="mt-3 flex items-center justify-center gap-4">
                  <button
                    onClick={() => setRoundCount((c) => Math.max(minRounds, c - 1))}
                    disabled={roundCount <= minRounds}
                    className="h-10 w-10 cursor-pointer rounded-lg bg-white/10 text-lg font-bold text-white disabled:opacity-30"
                  >
                    −
                  </button>
                  <span className="w-12 text-2xl font-black text-white">
                    {roundCount}
                  </span>
                  <button
                    onClick={() => setRoundCount((c) => Math.min(roundCap, c + 1))}
                    disabled={roundCount >= roundCap}
                    className="h-10 w-10 cursor-pointer rounded-lg bg-white/10 text-lg font-bold text-white disabled:opacity-30"
                  >
                    +
                  </button>
                </div>
                <p className="mt-3 text-xs text-slate-300/60">
                  Max {roundCap} of {totalTruths} truths — everyone is guaranteed
                  one, the rest is drawn at random, and the deck is cut early so
                  nobody can count cards.
                </p>
              </div>

              <Button className="w-full" onClick={() => onStartGame(roundCount)}>
                Start the guessing
              </Button>
            </>
          ) : (
            <p className="text-sm text-slate-300/60">
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
          <p className="text-white">
            Waiting for everyone else to submit their truths...
          </p>
          <p className="text-sm text-slate-300/60">
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
            <label className="text-xs font-semibold uppercase tracking-wide text-cyan-200/70">
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
              className="w-full resize-none rounded-xl bg-black/40 px-4 py-3 text-white placeholder-white/30 outline-none ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-cyan-400"
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
