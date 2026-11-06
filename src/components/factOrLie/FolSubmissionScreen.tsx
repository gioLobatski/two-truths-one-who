"use client";

import { useState } from "react";
import {
  AVATAR_OPTIONS,
  DEFAULT_AVATAR,
  FolPlayer,
  FolVote,
  STATEMENTS_PER_PLAYER,
  allStatementsSubmitted,
  maxRounds,
} from "@/lib/factOrLie";
import { Button, Card, Screen, Subtitle, Title } from "../ui";

type Draft = { text: string; declared: FolVote };

/** Treat/Trick pill toggle for one statement's private declaration. */
function DeclaredToggle({
  value,
  onChange,
}: {
  value: FolVote;
  onChange: (v: FolVote) => void;
}) {
  // Treat = the statement is a real fact; Trick = it's a lie. The stored
  // value stays 'fact' | 'lie' so the scoring engine is unchanged.
  const options: { value: FolVote; label: string; active: string }[] = [
    {
      value: "fact",
      label: "\uD83C\uDF6C Treat — it's true",
      active: "bg-emerald-400/15 text-emerald-200 ring-2 ring-inset ring-emerald-400/70",
    },
    {
      value: "lie",
      label: "\uD83D\uDC7B Trick — it's a lie",
      active: "bg-orange-400/15 text-orange-200 ring-2 ring-inset ring-orange-400/70",
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((o) => {
        const isActive = value === o.value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`cursor-pointer rounded-xl px-3 py-2 text-sm font-semibold transition ${
              isActive
                ? o.active
                : "bg-white/5 text-slate-300/80 ring-1 ring-inset ring-white/10 hover:bg-white/10"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Row of festive emoji the player picks as their gingerbread-head avatar. */
function AvatarPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {AVATAR_OPTIONS.map((emoji) => {
        const active = value === emoji;
        return (
          <button
            key={emoji}
            onClick={() => onChange(emoji)}
            aria-pressed={active}
            className={`flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl text-2xl transition ${
              active
                ? "bg-amber-400/20 ring-2 ring-inset ring-amber-400/70"
                : "bg-white/5 ring-1 ring-inset ring-white/10 hover:bg-white/10"
            }`}
          >
            {emoji}
          </button>
        );
      })}
    </div>
  );
}

export function FolSubmissionScreen({
  players,
  playerId,
  onSetStatements,
  onStartGame,
  isHost,
}: {
  players: FolPlayer[];
  playerId: string | null;
  onSetStatements: (
    playerId: string,
    statements: { text: string; declared: FolVote }[],
    avatar: string,
  ) => void;
  onStartGame: (roundCount: number) => void;
  isHost: boolean;
}) {
  const [draft, setDraft] = useState<Draft[]>(
    Array.from({ length: STATEMENTS_PER_PLAYER }, () => ({
      text: "",
      declared: "fact" as FolVote,
    })),
  );
  const [submitted, setSubmitted] = useState(false);

  const currentPlayer = players.find((p) => p.id === playerId);
  const [avatar, setAvatar] = useState<string>(
    currentPlayer?.avatar || DEFAULT_AVATAR,
  );

  // Host picks the deck size — capped at 75% of all statements, same
  // cut-early fairness rule as game 1
  const totalStatements = players.length * STATEMENTS_PER_PLAYER;
  const roundCap = maxRounds(players.length);
  const [roundCount, setRoundCount] = useState(roundCap);
  const minRounds = Math.min(2, roundCap);

  const hasSubmitted = currentPlayer?.statements.some((s) => s.text.trim().length > 0);
  const done = allStatementsSubmitted(players);
  const readyCount = players.filter((p) =>
    p.statements.some((s) => s.text.trim().length > 0),
  ).length;

  // Everyone has submitted — show the "start game" gate
  if (done) {
    return (
      <Screen>
        <Title>All statements locked in 🔒</Title>
        <Subtitle>The randomizer is ready!</Subtitle>
        <Card className="space-y-6 text-center">
          <p className="text-white">
            {players.length} players · {totalStatements} statements in the deck.
          </p>

          {isHost ? (
            <>
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
                  Max {roundCap} of {totalStatements} statements — everyone is
                  guaranteed one, the rest is drawn at random, and the deck is
                  cut early so nobody can count cards.
                </p>
              </div>

              <Button className="w-full" onClick={() => onStartGame(roundCount)}>
                Start the trick-or-treating
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

  // Moderator (host who isn't playing) — just watches submissions come in
  if (!currentPlayer) {
    return (
      <Screen>
        <Title>Waiting for statements…</Title>
        <Subtitle>Players are cooking up their treats and tricks</Subtitle>
        <Card className="space-y-4 text-center">
          <p className="text-sm text-slate-300/60">
            {readyCount} / {players.length} players ready
          </p>
        </Card>
      </Screen>
    );
  }

  // Current player already submitted
  if (hasSubmitted || submitted) {
    return (
      <Screen>
        <Title>Statements submitted ✓</Title>
        <Card className="space-y-4 text-center">
          <p className="text-white">
            Waiting for everyone else to submit their statements...
          </p>
          <p className="text-sm text-slate-300/60">
            {readyCount} / {players.length} players ready
          </p>
        </Card>
      </Screen>
    );
  }

  const canSubmit = draft.every((d) => d.text.trim().length > 0);

  function submit() {
    if (!playerId) return;
    onSetStatements(playerId, draft, avatar);
    setSubmitted(true);
  }

  return (
    <Screen>
      <div className="space-y-2">
        <Title>Your Statements</Title>
        <Subtitle>
          Write {STATEMENTS_PER_PLAYER} things about you and quietly mark each
          one a treat (true) or a trick (lie) — the room never sees your marks,
          only your words.
        </Subtitle>
      </div>

      <Card className="space-y-5">
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-cyan-200/70">
            Your costume
          </label>
          <p className="text-xs text-slate-300/60">
            Pick the face that goes in your gingerbread head this game.
          </p>
          <AvatarPicker value={avatar} onChange={setAvatar} />
        </div>

        {draft.map((entry, i) => (
          <div key={i} className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-cyan-200/70">
              Statement {i + 1}
            </label>
            <textarea
              value={entry.text}
              onChange={(e) =>
                setDraft((d) =>
                  d.map((v, j) => (j === i ? { ...v, text: e.target.value } : v)),
                )
              }
              rows={2}
              maxLength={140}
              placeholder="Something about you — serve it straight or with a twist…"
              className="w-full resize-none rounded-xl bg-black/40 px-4 py-3 text-white placeholder-white/30 outline-none ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-cyan-400"
            />
            <DeclaredToggle
              value={entry.declared}
              onChange={(declared) =>
                setDraft((d) =>
                  d.map((v, j) => (j === i ? { ...v, declared } : v)),
                )
              }
            />
          </div>
        ))}

        <p className="text-xs text-slate-300/60">
          Your treat/trick marks stay private — they only decide who scores when
          the round is revealed.
        </p>

        <Button className="w-full" onClick={submit} disabled={!canSubmit}>
          Lock in my statements
        </Button>
      </Card>
    </Screen>
  );
}
