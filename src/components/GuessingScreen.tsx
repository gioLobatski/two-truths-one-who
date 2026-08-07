"use client";

import { useEffect, useMemo, useState } from "react";
import { GUESS_TIME_LIMIT, Player, Round, pendingGuessers } from "@/lib/game";
import { Button, Card, Screen, Subtitle, Title } from "./ui";

/** Seconds left until a guessing deadline, ticking down (null = no timer). */
function useCountdown(deadline: number | null): number | null {
  const calc = () =>
    deadline === null ? null : Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
  const [remaining, setRemaining] = useState<number | null>(calc);

  useEffect(() => {
    if (deadline === null) {
      setRemaining(null);
      return;
    }
    setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    const timer = setInterval(() => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) clearInterval(timer);
    }, 250);
    return () => clearInterval(timer);
  }, [deadline]);

  return remaining;
}

/** Countdown pill + draining bar shown while guesses are still open. */
function GuessTimer({ remaining }: { remaining: number | null }) {
  if (remaining === null) return null;
  const expired = remaining <= 0;
  const low = !expired && remaining <= 10;
  const pct = Math.min(100, (remaining / GUESS_TIME_LIMIT) * 100);
  const tone = expired
    ? "text-rose-300 ring-rose-400/40"
    : low
      ? "text-amber-300 ring-amber-400/40"
      : "text-cyan-200 ring-cyan-400/30";
  const bar = expired ? "bg-rose-400" : low ? "bg-amber-400" : "bg-cyan-400";

  return (
    <div className="mx-auto w-full max-w-xl space-y-1.5">
      <p
        className={`rounded-full bg-black/30 px-4 py-1 text-center font-heading text-lg font-black tabular-nums ring-1 ring-inset ${tone}`}
        role="timer"
        aria-label={expired ? "Time's up" : `${remaining} seconds left to guess`}
      >
        {expired ? "Time's up!" : `0:${String(remaining).padStart(2, "0")}`}
      </p>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-[width] duration-200 ease-linear ${bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function GuessingScreen({
  round,
  players,
  playerId,
  roundNumber,
  totalRounds,
  phase,
  phaseStartedAt,
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
  phaseStartedAt: string | null;
  onReveal: () => void;
  onSubmitGuess: (guesserId: string, guessedId: string) => void;
  onScore: () => void;
  isHost: boolean;
}) {
  const isAuthor = playerId === round.authorId;
  const hasGuessed = playerId ? round.guesses[playerId] !== undefined : false;
  const pending = pendingGuessers(round, players);

  // Shared deadline: the games row's updated_at marks when the host started
  // guessing, so every client (even after a refresh) counts from the same point.
  const deadline = useMemo(
    () =>
      phase === "guessing" && phaseStartedAt
        ? Date.parse(phaseStartedAt) + GUESS_TIME_LIMIT * 1000
        : null,
    [phase, phaseStartedAt],
  );
  const remaining = useCountdown(deadline);
  const expired = remaining !== null && remaining <= 0;

  // Once the clock runs out the host can end the wait from whichever view
  // they happen to be on (moderator, author, or already guessed).
  const expiredHostReveal = expired && isHost && (
    <Button className="w-full" onClick={onScore}>
      Time&apos;s up — reveal &amp; score
    </Button>
  );

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
          <GuessTimer remaining={remaining} />
          <p className="text-center text-sm text-slate-300/60">
            Watching {pending.length} player{pending.length !== 1 ? "s" : ""} guess...
          </p>
          {expiredHostReveal}
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
          <GuessTimer remaining={remaining} />
          <p className="text-center text-sm text-slate-300/60">
            Watching {pending.length} player{pending.length !== 1 ? "s" : ""} guess...
          </p>
          {isHost && expiredHostReveal}
        </Card>
      </Screen>
    );
  }

  // Already guessed
  if (hasGuessed) {
    return (
      <Screen>
        <Title>Guess locked in ✓</Title>
        <GuessTimer remaining={remaining} />
        <Card className="space-y-4 text-center">
          <p className="text-white">
            Waiting for {pending.length} more player{pending.length !== 1 ? "s" : ""} to guess...
          </p>
          {expiredHostReveal}
        </Card>
      </Screen>
    );
  }

  // Current player needs to guess — unless the clock beat them to it
  if (expired) {
    return (
      <Screen>
        <Subtitle>Who wrote this?</Subtitle>
        <blockquote className="mx-auto max-w-xl rounded-2xl bg-black/30 px-6 py-5 text-center text-lg font-medium text-white ring-1 ring-inset ring-white/10">
          &ldquo;{round.truth}&rdquo;
        </blockquote>
        <GuessTimer remaining={remaining} />
        <Card className="space-y-2 text-center">
          <Title>Time&apos;s up ⏱</Title>
          <p className="text-sm text-slate-300/60">
            Too slow — this round scores without your guess.
            {!isHost && " Waiting for the host to reveal..."}
          </p>
          {expiredHostReveal}
        </Card>
      </Screen>
    );
  }

  const options = players.filter((p) => p.id !== playerId);

  return (
    <Screen>
      <div className="space-y-2">
        <Subtitle>Who wrote this?</Subtitle>
        <blockquote className="mx-auto max-w-xl rounded-2xl bg-black/30 px-6 py-5 text-center text-lg font-medium text-white ring-1 ring-inset ring-white/10">
          &ldquo;{round.truth}&rdquo;
        </blockquote>
      </div>

      <GuessTimer remaining={remaining} />

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
