"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, Card, Screen, Subtitle, Title } from "../ui";
import { Logo, LOGOS } from "../Logo";

/**
 * Tricked or Treat's own home screen — same create/join shape as game 1,
 * with the festive copy. Kept separate (rather than prop-drilling
 * HomeScreen) so each game can evolve its onboarding text freely.
 */
export function FolHomeScreen({
  onCreateGame,
  onJoinGame,
  loading,
}: {
  onCreateGame: (playerName: string | null) => void;
  onJoinGame: (gameId: string, playerName: string) => void;
  loading: boolean;
}) {
  const [mode, setMode] = useState<"home" | "join" | "create">("home");
  const [gameCode, setGameCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [hostRole, setHostRole] = useState<"playing" | "moderating">("playing");

  function handleJoin() {
    const code = gameCode.trim();
    const name = playerName.trim();
    if (!code || !name) return;
    onJoinGame(code, name);
  }

  function handleCreate() {
    // A moderating host runs the room without a player entry
    if (hostRole === "moderating") {
      onCreateGame(null);
      return;
    }
    const name = playerName.trim();
    if (!name) return;
    onCreateGame(name);
  }

  if (mode === "join") {
    return (
      <Screen>
        <div className="space-y-2">
          <Title>Join a <span className="text-amber-400">Room</span></Title>
          <Subtitle>Enter the game code and your name</Subtitle>
        </div>

        <Card className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-cyan-200/70">
              Game Code
            </label>
            <input
              value={gameCode}
              onChange={(e) => setGameCode(e.target.value)}
              placeholder="Paste the game code"
              className="w-full rounded-xl bg-black/40 px-4 py-3 text-white placeholder-white/30 outline-none ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-cyan-400"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-cyan-200/70">
              Your Name
            </label>
            <input
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              placeholder="What should we call you?"
              maxLength={24}
              className="w-full rounded-xl bg-black/40 px-4 py-3 text-white placeholder-white/30 outline-none ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-cyan-400"
            />
          </div>

          <Button
            className="w-full"
            onClick={handleJoin}
            disabled={!gameCode.trim() || !playerName.trim() || loading}
          >
            {loading ? "Joining..." : "Join Game"}
          </Button>

          <button
            onClick={() => setMode("home")}
            className="w-full cursor-pointer text-center text-sm text-cyan-200/60 hover:text-cyan-100"
          >
            ← Back
          </button>
        </Card>
      </Screen>
    );
  }

  if (mode === "create") {
    const moderating = hostRole === "moderating";
    return (
      <Screen>
        <div className="space-y-2">
          <Title>Create a <span className="text-amber-400">Room</span></Title>
          <Subtitle>You&apos;ll host — choose whether you play too</Subtitle>
        </div>

        <Card className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-cyan-200/70">
              Your Role
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setHostRole("playing")}
                className={`cursor-pointer rounded-xl px-3 py-3 text-sm font-semibold transition ${
                  !moderating
                    ? "bg-amber-400/15 text-amber-200 ring-2 ring-inset ring-amber-400/70"
                    : "bg-white/5 text-slate-300/80 ring-1 ring-inset ring-white/10 hover:bg-white/10"
                }`}
              >
                I&apos;ll play
              </button>
              <button
                onClick={() => setHostRole("moderating")}
                className={`cursor-pointer rounded-xl px-3 py-3 text-sm font-semibold transition ${
                  moderating
                    ? "bg-amber-400/15 text-amber-200 ring-2 ring-inset ring-amber-400/70"
                    : "bg-white/5 text-slate-300/80 ring-1 ring-inset ring-white/10 hover:bg-white/10"
                }`}
              >
                Just host
              </button>
            </div>
            <p className="text-xs text-slate-300/60">
              {moderating
                ? "You'll run the room for others — no statements, no votes, but you get to peek at the truth each round."
                : "You'll join the player list and write statements like everyone else."}
            </p>
          </div>

          {!moderating && (
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-cyan-200/70">
                Your Name
              </label>
              <input
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                placeholder="What should we call you?"
                maxLength={24}
                className="w-full rounded-xl bg-black/40 px-4 py-3 text-white placeholder-white/30 outline-none ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-cyan-400"
              />
            </div>
          )}

          <Button
            className="w-full"
            onClick={handleCreate}
            disabled={moderating ? loading : !playerName.trim() || loading}
          >
            {loading ? "Creating..." : moderating ? "Create Room" : "Create Game"}
          </Button>

          <button
            onClick={() => setMode("home")}
            className="w-full cursor-pointer text-center text-sm text-cyan-200/60 hover:text-cyan-100"
          >
            ← Back
          </button>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <Logo size={140} logo={LOGOS.trickedOrTreat} />
      <div className="space-y-2">
        <Title>
          <span className="text-orange-400">Tricked</span>{" "}
          <span className="text-emerald-400">or Treat</span>
        </Title>
        <Subtitle>
          Serve up a truth or a tall tale — the room calls trick or treat.
        </Subtitle>
      </div>

      <Card className="space-y-4">
        <Button className="w-full" onClick={() => setMode("create")} disabled={loading}>
          {loading ? "Creating..." : "Create Game"}
        </Button>

        <Button
          className="w-full"
          variant="ghost"
          onClick={() => setMode("join")}
        >
          Join Game
        </Button>
      </Card>

      <Link
        href="/"
        className="text-sm text-cyan-200/60 hover:text-cyan-100"
      >
        ← Other games
      </Link>
    </Screen>
  );
}
