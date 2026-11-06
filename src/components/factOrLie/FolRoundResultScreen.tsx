"use client";

import { useEffect, useState } from "react";
import { FolPlayer, FolRound, FolVote, scoreVoteRound } from "@/lib/factOrLie";
import { Button, Card, Screen, Subtitle, Title } from "../ui";
import { GingerbreadStatement } from "./GingerbreadStatement";

/**
 * The declared verdict flips in a beat after mount — statement and author
 * land first, then the treat/trick reveal, then the room reads the fallout.
 */
function DeclaredBadge({ declared }: { declared: FolVote }) {
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setFlipped(true), 900);
    return () => clearTimeout(timer);
  }, []);

  const isTreat = declared === "fact";
  return (
    <div className="flex justify-center">
      <span
        className={`rounded-full px-5 py-2 font-heading text-lg font-black uppercase tracking-wide transition-all duration-500 ${
          flipped
            ? isTreat
              ? "bg-emerald-400/20 text-emerald-200 ring-2 ring-inset ring-emerald-400/60"
              : "bg-orange-400/20 text-orange-200 ring-2 ring-inset ring-orange-400/60"
            : "scale-90 bg-white/5 text-transparent ring-1 ring-inset ring-white/10"
        }`}
      >
        {flipped
          ? isTreat
            ? "🍬 It was a TREAT"
            : "👻 It was a TRICK"
          : "• • •"}
      </span>
    </div>
  );
}

// A voter's call rendered in themed terms.
function callLabel(vote: FolVote) {
  return vote === "fact" ? "Treat" : "Trick";
}

export function FolRoundResultScreen({
  round,
  players,
  isLastRound,
  onNext,
  isHost,
}: {
  round: FolRound;
  players: FolPlayer[];
  isLastRound: boolean;
  onNext: () => void;
  isHost: boolean;
}) {
  const byId = (id: string) => players.find((p) => p.id === id);
  const lines = scoreVoteRound(round);

  const voteEntries = Object.entries(round.votes).filter(
    ([voterId]) => voterId !== round.authorId,
  );

  // Running scoreboard — scores already include this round's points
  const ranked = [...players].sort((a, b) => b.score - a.score);
  const gainedThisRound = new Map<string, number>();
  for (const line of lines) {
    gainedThisRound.set(
      line.playerId,
      (gainedThisRound.get(line.playerId) ?? 0) + line.points,
    );
  }

  return (
    <Screen>
      <div className="space-y-2">
        <Subtitle>{round.authorName} was on trial…</Subtitle>
        <Title>
          <span className="text-orange-400">Tricked</span>{" "}
          <span className="text-emerald-400">or Treat</span>
        </Title>
      </div>

      <Card className="space-y-6">
        <GingerbreadStatement
          text={round.text}
          authorName={round.authorName}
          avatar={round.authorAvatar}
        />

        <DeclaredBadge declared={round.declared} />

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-cyan-200/70">
            The room called it
          </p>
          {voteEntries.length === 0 ? (
            <p className="text-sm text-slate-300/60">
              Nobody got a vote in this round.
            </p>
          ) : (
            voteEntries.map(([voterId, vote]) => {
              const correct = vote === round.declared;
              return (
                <div
                  key={voterId}
                  className="flex items-center justify-between rounded-xl bg-black/20 px-4 py-2 text-sm"
                >
                  <span className="text-white">{byId(voterId)?.name}</span>
                  <span className={correct ? "text-emerald-300" : "text-rose-300/80"}>
                    {correct
                      ? `✓ called it ${callLabel(vote)}`
                      : `fooled — said ${callLabel(vote)}`}
                  </span>
                </div>
              );
            })
          )}
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
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-white">
                  <span className="font-semibold">{byId(line.playerId)?.name}</span>{" "}
                  — {line.reason}
                </span>
                <span className="font-bold text-emerald-300">+{line.points}</span>
              </div>
            ))
          )}
        </div>

        <div className="space-y-2 border-t border-white/10 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-cyan-200/70">
            Scoreboard
          </p>
          {ranked.map((p, i) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-xl bg-black/20 px-4 py-2 text-sm ring-1 ring-inset ring-white/5"
            >
              <span className="flex items-center gap-3 text-white">
                <span className="w-5 text-center font-semibold text-cyan-200/70">
                  {i + 1}
                </span>
                <span aria-hidden>{p.avatar}</span>
                {p.name}
              </span>
              <span className="flex items-baseline gap-2">
                {gainedThisRound.has(p.id) && (
                  <span className="text-xs font-semibold text-emerald-300">
                    +{gainedThisRound.get(p.id)}
                  </span>
                )}
                <span className="font-bold text-amber-400">{p.score}</span>
              </span>
            </div>
          ))}
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
