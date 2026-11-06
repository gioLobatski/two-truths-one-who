"use client";

import { useEffect, useMemo, useState } from "react";
import {
  NAUGHTY_COPY,
  POINTS_NAUGHTY_PENALTY,
  FolPlayer,
  FolRound,
  FolVote,
  VOTE_TIME_LIMIT,
  classifyMiss,
  pendingVoters,
} from "@/lib/factOrLie";
import { Button, Card, Screen, Subtitle, Title } from "../ui";
import { GingerbreadStatement } from "./GingerbreadStatement";

/** Seconds left until a voting deadline, ticking down (null = no timer). */
function useCountdown(deadline: number | null): number | null {
  const calc = () =>
    deadline === null
      ? null
      : Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
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

/** Countdown pill + draining bar shown while votes are still open. */
function VoteTimer({ remaining }: { remaining: number | null }) {
  if (remaining === null) return null;
  const expired = remaining <= 0;
  const low = !expired && remaining <= 10;
  const pct = Math.min(100, (remaining / VOTE_TIME_LIMIT) * 100);
  const tone = expired
    ? "text-rose-300 ring-rose-400/40"
    : low
      ? "text-amber-300 ring-amber-400/40"
      : "text-emerald-200 ring-emerald-400/30";
  const bar = expired ? "bg-rose-400" : low ? "bg-amber-400" : "bg-emerald-400";

  return (
    <div className="mx-auto w-full max-w-xl space-y-1.5">
      <p
        className={`rounded-full bg-black/30 px-4 py-1 text-center font-heading text-lg font-black tabular-nums ring-1 ring-inset ${tone}`}
        role="timer"
        aria-label={expired ? "Time's up" : `${remaining} seconds left to vote`}
      >
        {expired ? "Time's up!" : `${remaining}s`}
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

// Themed wording: a "treat" is the truth (fact), a "trick" is the lie. The
// underlying declared/vote values stay 'fact' | 'lie' in the data layer.
const TREAT = { value: "fact" as FolVote, label: "Treat", hint: "it's the truth", emoji: "🍬" };
const TRICK = { value: "lie" as FolVote, label: "Trick", hint: "it's a lie", emoji: "👻" };

/** Big Treat / Trick choice. Supports showing and re-calling (upsert) a vote. */
function VoteButtons({
  onVote,
  current,
}: {
  onVote: (vote: FolVote) => void;
  current?: FolVote;
}) {
  const options = [
    {
      ...TREAT,
      tone:
        current === TREAT.value
          ? "bg-emerald-400/20 text-emerald-100 ring-2 ring-inset ring-emerald-400/70"
          : "bg-emerald-500/10 text-emerald-100 ring-1 ring-inset ring-emerald-400/30 hover:bg-emerald-500/20",
    },
    {
      ...TRICK,
      tone:
        current === TRICK.value
          ? "bg-orange-400/20 text-orange-100 ring-2 ring-inset ring-orange-400/70"
          : "bg-orange-500/10 text-orange-100 ring-1 ring-inset ring-orange-400/30 hover:bg-orange-500/20",
    },
  ];

  return (
    <Card className="grid gap-3">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onVote(o.value)}
          className={`cursor-pointer rounded-xl px-5 py-4 text-lg font-bold transition active:scale-[0.98] ${o.tone}`}
        >
          <span className="mr-2">{o.emoji}</span>
          {o.label}
          <span className="ml-2 text-sm font-medium opacity-70">— {o.hint}</span>
          {current === o.value && (
            <span className="ml-2 text-xs font-semibold uppercase tracking-wide opacity-80">
              · your call
            </span>
          )}
        </button>
      ))}
    </Card>
  );
}

/** Small themed verdict chip for a declared/vote value. */
function treatTone(vote: FolVote) {
  return vote === "fact"
    ? { text: "a TREAT", cls: "text-emerald-300" }
    : { text: "a TRICK", cls: "text-orange-300" };
}

export function FolVotingScreen({
  round,
  players,
  playerId,
  roundNumber,
  totalRounds,
  phase,
  phaseStartedAt,
  onOpenVoting,
  onSubmitVote,
  onScore,
  isHost,
}: {
  round: FolRound;
  players: FolPlayer[];
  playerId: string | null;
  roundNumber: number;
  totalRounds: number;
  phase: "reveal" | "voting";
  phaseStartedAt: string | null;
  onOpenVoting: () => void;
  onSubmitVote: (voterId: string, vote: FolVote) => void;
  onScore: () => void;
  isHost: boolean;
}) {
  const isAuthor = playerId === round.authorId;
  const isModerator = playerId === null || !players.some((p) => p.id === playerId);
  const myVote = playerId ? round.votes[playerId] : undefined;
  const pending = pendingVoters(round, players);

  // Shared deadline: the games row's updated_at marks when the host opened
  // voting, so every client (even after a refresh) counts from the same point.
  const deadline = useMemo(
    () =>
      phase === "voting" && phaseStartedAt
        ? Date.parse(phaseStartedAt) + VOTE_TIME_LIMIT * 1000
        : null,
    [phase, phaseStartedAt],
  );
  const remaining = useCountdown(deadline);
  const expired = remaining !== null && remaining <= 0;

  // GM peek is opt-in: game masters share their screen, so the truth stays
  // hidden until they deliberately click, and re-hides every new round.
  const [peeked, setPeeked] = useState(false);
  useEffect(() => {
    setPeeked(false);
  }, [round.id]);

  // Once the clock runs out the host can end the wait from whichever view
  // they happen to be on (moderator, author, or already voted).
  const expiredHostReveal = expired && isHost && (
    <Button className="w-full" onClick={onScore}>
      Time&apos;s up — reveal &amp; score
    </Button>
  );

  // Reveal phase — the statement and its author are shown, votes still closed
  if (phase === "reveal") {
    return (
      <Screen>
        <Subtitle>
          Round {roundNumber} of {totalRounds}
        </Subtitle>
        <Title>
          <span className="text-orange-400">Tricked</span>{" "}
          <span className="text-emerald-400">or Treat?</span>
        </Title>
        <Card className="space-y-5 py-6">
          <GingerbreadStatement
            text={round.text}
            authorName={round.authorName}
            avatar={round.authorAvatar}
          />
        </Card>
        <Card className="space-y-3 text-center">
          <p className="text-sm text-slate-300/70">
            {round.authorName} is serving this one up — is it a treat of a
            truth, or a trick of a lie? Nobody here knows which... yet.
          </p>
          {isHost ? (
            <Button className="w-full" onClick={onOpenVoting}>
              Start voting
            </Button>
          ) : (
            <p className="text-sm text-slate-300/60">
              Waiting for the host to open voting...
            </p>
          )}
        </Card>
      </Screen>
    );
  }

  // All votes are in
  if (pending.length === 0) {
    return (
      <Screen>
        <Title>Everyone&apos;s made their call 🎃</Title>
        <Card className="space-y-5 py-6">
          <GingerbreadStatement
            text={round.text}
            authorName={round.authorName}
            avatar={round.authorAvatar}
          />
        </Card>
        <Card className="space-y-4 text-center">
          <Subtitle>Time to reveal whether it was a treat or a trick.</Subtitle>
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

  // Moderator — runs the round; the truth is one deliberate click away
  if (isModerator) {
    const verdict = treatTone(round.declared);
    return (
      <Screen>
        <Subtitle>
          Round {roundNumber} of {totalRounds}
        </Subtitle>
        <Title>You&apos;re running this one 🧙</Title>
        <Card className="space-y-5 py-6">
          <GingerbreadStatement
            text={round.text}
            authorName={round.authorName}
            avatar={round.authorAvatar}
          />
        </Card>
        <VoteTimer remaining={remaining} />
        <Card className="space-y-4 text-center">
          {/* GM-only peek: hidden by default so the room can be screen-shared
              safely — the host reveals it to themselves, never to viewers */}
          {peeked ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-300/70">
                The truth (just for you):{" "}
                <span className={`font-bold ${verdict.cls}`}>{verdict.text}</span>
              </p>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setPeeked(false)}
              >
                Hide it again
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setPeeked(true)}
            >
              👁 Peek at the truth
            </Button>
          )}
          <p className="text-sm text-slate-300/60">
            Watching {pending.length} player
            {pending.length !== 1 ? "s" : ""} vote...
          </p>
          {expiredHostReveal}
        </Card>
      </Screen>
    );
  }

  // Author doesn't vote on their own statement
  if (isAuthor) {
    return (
      <Screen>
        <Subtitle>
          Round {roundNumber} of {totalRounds}
        </Subtitle>
        <Title>This one&apos;s yours 🎭</Title>
        <Card className="space-y-5 py-6">
          <GingerbreadStatement
            text={round.text}
            authorName={round.authorName}
            avatar={round.authorAvatar}
          />
        </Card>
        <VoteTimer remaining={remaining} />
        <Card className="space-y-4 text-center">
          <p className="text-sm text-slate-300/60">
            Sit tight — {pending.length} player
            {pending.length !== 1 ? "s" : ""} are deciding whether you fooled
            them...
          </p>
          {expiredHostReveal}
        </Card>
      </Screen>
    );
  }

  // Already voted — a re-call stays open until the clock dies
  if (myVote !== undefined && !expired) {
    const mine = treatTone(myVote);
    return (
      <Screen>
        <Subtitle>
          Round {roundNumber} of {totalRounds}
        </Subtitle>
        <Title>Call locked in ✓</Title>
        <Card className="space-y-5 py-6">
          <GingerbreadStatement
            text={round.text}
            authorName={round.authorName}
            avatar={round.authorAvatar}
          />
        </Card>
        <VoteTimer remaining={remaining} />
        <Card className="space-y-4 text-center">
          <p className="text-sm text-slate-300/70">
            You said <span className={`font-bold ${mine.cls}`}>{mine.text}</span>{" "}
            — change your mind until the clock runs out.
          </p>
          <p className="text-sm text-slate-300/60">
            Waiting for {pending.length} more player
            {pending.length !== 1 ? "s" : ""} to vote...
          </p>
          {expiredHostReveal}
        </Card>
      </Screen>
    );
  }

  // Current player needs to vote — unless the clock beat them to it
  if (expired) {
    // This miss is already decided — the scoring step will record it, so
    // show its consequence now: another warning, or a free bonus for the
    // presenter if the naughty list ran out.
    const me = playerId ? players.find((p) => p.id === playerId) : undefined;
    const call = me
      ? classifyMiss(players.length, me.missedVotes)
      : undefined;
    return (
      <Screen>
        <Subtitle>
          Round {roundNumber} of {totalRounds}
        </Subtitle>
        <Card className="space-y-5 py-6">
          <GingerbreadStatement
            text={round.text}
            authorName={round.authorName}
            avatar={round.authorAvatar}
          />
        </Card>
        <VoteTimer remaining={remaining} />
        <Card className="space-y-2 text-center">
          <Title>Time&apos;s up ⏱</Title>
          {call &&
            (call.penalized ? (
              <p className="text-sm font-semibold text-rose-300">
                {NAUGHTY_COPY} — {round.authorName} picks up +{" "}
                {POINTS_NAUGHTY_PENALTY} for the no-show.
              </p>
            ) : (
              <p className="text-sm text-amber-300">
                That was warning {call.missNumber} of {call.threshold} — keep
                skipping and the presenter starts earning free points.
              </p>
            ))}
          <p className="text-sm text-slate-300/60">
            Too slow — this round scores without your call.
            {!isHost && " Waiting for the host to reveal..."}
          </p>
          {expiredHostReveal}
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <div className="space-y-2">
        <Subtitle>
          Round {roundNumber} of {totalRounds}
        </Subtitle>
        <Title>
          <span className="text-orange-400">Trick</span>{" "}
          <span className="text-emerald-400">or Treat?</span>
        </Title>
      </div>
      <Card className="space-y-5 py-6">
        <GingerbreadStatement
          text={round.text}
          authorName={round.authorName}
          avatar={round.authorAvatar}
        />
      </Card>
      <VoteTimer remaining={remaining} />
      <VoteButtons onVote={(vote) => playerId && onSubmitVote(playerId, vote)} />
    </Screen>
  );
}
