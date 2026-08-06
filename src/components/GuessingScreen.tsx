"use client";

import { useState } from "react";
import { Player, Round, pendingGuessers } from "@/lib/game";
import { Button, Card, Screen, Subtitle, Title } from "./ui";

export function GuessingScreen({
  round,
  players,
  playerId,
  roundNumber,
  totalRounds,
  phase,
  onReveal,
  onSubmitGuess,
  onScore,
  isHost,
}: {
  round: Round;
  players: Player[];
  playerId: string | null;
  roundNumber: number;
  totalRounds: number;
  phase: "reveal" | "guessing";
  onReveal: () => void;
  onSubmitGuess: (guesserId: string, guessedId: string) => void;
  onScore: () => void;
  isHost: boolean;
}) {
  const isAuthor = playerId === round.authorId;
  const hasGuessed = playerId ? round.guesses[playerId] !== undefined : false;
  const pending = pendingGuessers(round, players);

  // Reveal phase — the truth is shown to the whole room
  if (phase === "reveal") {
    return (
      <Screen>
        <Subtitle>
          Round {roundNumber} of {totalRounds}
        </Subtitle>
        <Title>Whose truth is this?</Title>
        <Card className="space-y-6">
          <blockquote className="rounded-2xl bg-black/30 px-6 py-8 text-center text-xl font-medium leading-relaxed text-white ring-1 ring-inset ring-white/10">
            &ldquo;{round.truth}&rdquo;
          </blockquote>
          {isHost ? (
            <Button className="w-full" onClick={onReveal}>
              Start guessing
            </Button>
          ) : (
            <p className="text-center text-sm text-slate-300/60">
              Waiting for the host to start guessing...
            </p>
          )}
        </Card>
      </Screen>
    );
  }

  // All guesses are in
  if (pending.length === 0) {
    return (
      <Screen>
        <Title>Everyone&apos;s guessed 🤔</Title>
        <Card className="space-y-6 text-center">
          <Subtitle>Time to reveal the truth&apos;s owner.</Subtitle>
          {isHost ? (
            <Button className="w-full" onClick={onScore}>
              Reveal &amp; score
            </Button>
          ) : (
            <p className="text-sm text-slate-300/60">
              Waiting for the host to reveal...
            </p>
          )}
        </Card>
      </Screen>
    );
  }

  // Moderator — watches the round instead of guessing
  if (playerId === null || !players.some((p) => p.id === playerId)) {
    return (
      <Screen>
        <Subtitle>
          Round {roundNumber} of {totalRounds}
        </Subtitle>
        <Title>You&apos;re running this one 🎬</Title>
        <Card className="space-y-6">
          <blockquote className="rounded-2xl bg-black/30 px-6 py-5 text-center text-lg font-medium text-white ring-1 ring-inset ring-white/10">
            &ldquo;{round.truth}&rdquo;
          </blockquote>
          <p className="text-center text-sm text-slate-300/60">
            Watching {pending.length} player{pending.length !== 1 ? "s" : ""} guess...
          </p>
        </Card>
      </Screen>
    );
  }

  // Author doesn't guess
  if (isAuthor) {
    return (
      <Screen>
        <Subtitle>
          Round {roundNumber} of {totalRounds}
        </Subtitle>
        <Title>You wrote this one 🤫</Title>
        <Card className="space-y-6">
          <blockquote className="rounded-2xl bg-black/30 px-6 py-5 text-center text-lg font-medium text-white ring-1 ring-inset ring-white/10">
            &ldquo;{round.truth}&rdquo;
          </blockquote>
          <p className="text-center text-sm text-slate-300/60">
            Watching {pending.length} player{pending.length !== 1 ? "s" : ""} guess...
          </p>
        </Card>
      </Screen>
    );
  }

  // Already guessed
  if (hasGuessed) {
    return (
      <Screen>
        <Title>Guess locked in ✓</Title>
        <Card className="space-y-4 text-center">
          <p className="text-white">
            Waiting for {pending.length} more player{pending.length !== 1 ? "s" : ""} to guess...
          </p>
        </Card>
      </Screen>
    );
  }

  // Current player needs to guess
  const options = players.filter((p) => p.id !== playerId);

  return (
    <Screen>
      <div className="space-y-2">
        <Subtitle>Who wrote this?</Subtitle>
        <blockquote className="mx-auto max-w-xl rounded-2xl bg-black/30 px-6 py-5 text-center text-lg font-medium text-white ring-1 ring-inset ring-white/10">
          &ldquo;{round.truth}&rdquo;
        </blockquote>
      </div>

      <Card className="space-y-3">
        {options.map((p) => (
          <Button
            key={p.id}
            variant="ghost"
            className="w-full"
            onClick={() => playerId && onSubmitGuess(playerId, p.id)}
          >
            {p.name}
          </Button>
        ))}
      </Card>
    </Screen>
  );
}
