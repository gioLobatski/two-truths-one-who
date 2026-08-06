"use client";

import { useState } from "react";
import { MIN_PLAYERS, Player } from "@/lib/game";
import { Button, Card, Screen, Subtitle, Title } from "./ui";

export function LobbyScreen({
  gameId,
  players,
  isHost,
  isModerator,
  onStart,
  onLeave,
}: {
  gameId: string;
  players: Player[];
  isHost: boolean;
  isModerator: boolean;
  onStart: () => void;
  onLeave: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const canStart = players.length >= MIN_PLAYERS;

  function copyCode() {
    navigator.clipboard.writeText(gameId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Screen>
      <div className="space-y-2">
        <Title>Game Lobby</Title>
        <Subtitle>Share the code — at least {MIN_PLAYERS} players needed</Subtitle>
      </div>

      <Card className="space-y-6">
        {/* Game code to share */}
        <div className="rounded-xl bg-black/30 px-4 py-3 text-center ring-1 ring-inset ring-white/10">
          <p className="text-xs uppercase tracking-wide text-cyan-200/70 mb-1">
            Game Code
          </p>
          <p className="font-mono text-lg font-bold text-white break-all">
            {gameId}
          </p>
          <button
            onClick={copyCode}
            className="mt-2 cursor-pointer text-sm text-cyan-300 hover:text-cyan-200"
          >
            {copied ? "✓ Copied!" : "Copy code"}
          </button>
        </div>

        {/* Player list */}
        {players.length === 0 ? (
          <p className="py-6 text-center text-slate-300/60">
            Waiting for players to join...
          </p>
        ) : (
          <ul className="space-y-2">
            {players.map((p, i) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-xl bg-black/20 px-4 py-3 ring-1 ring-inset ring-white/5"
              >
                <span className="font-medium text-white">
                  <span className="mr-2 text-cyan-200/70">{i + 1}.</span>
                  {p.name}
                </span>
              </li>
            ))}
          </ul>
        )}

        {/* Host role notice */}
        {isModerator && (
          <p className="rounded-xl bg-cyan-500/10 px-4 py-3 text-center text-sm text-cyan-100 ring-1 ring-inset ring-cyan-400/20">
            You&apos;re moderating this room — you&apos;ll run each phase without
            submitting truths or guessing.
          </p>
        )}

        {/* Host controls */}
        {isHost && (
          <Button
            onClick={onStart}
            disabled={!canStart}
            className="w-full"
          >
            {canStart
              ? "Start — enter your truths"
              : `Need ${MIN_PLAYERS - players.length} more player${
                  MIN_PLAYERS - players.length === 1 ? "" : "s"
                }`}
          </Button>
        )}

        {!isHost && (
          <p className="text-center text-sm text-slate-300/60">
            Waiting for the host to start...
          </p>
        )}

        <button
          onClick={onLeave}
          className="w-full cursor-pointer text-center text-sm text-rose-300/60 hover:text-rose-300"
        >
          Leave game
        </button>
      </Card>
    </Screen>
  );
}
