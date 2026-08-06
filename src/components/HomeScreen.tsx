"use client";

import { useState } from "react";
import { Button, Card, Screen, Subtitle, Title } from "./ui";
import { Logo } from "./Logo";

export function HomeScreen({
  onCreateGame,
  onJoinGame,
  loading,
}: {
  onCreateGame: (playerName: string) => void;
  onJoinGame: (gameId: string, playerName: string) => void;
  loading: boolean;
}) {
  const [mode, setMode] = useState<"home" | "join" | "create">("home");
  const [gameCode, setGameCode] = useState("");
  const [playerName, setPlayerName] = useState("");

  function handleJoin() {
    const code = gameCode.trim();
    const name = playerName.trim();
    if (!code || !name) return;
    onJoinGame(code, name);
  }

  function handleCreate() {
    const name = playerName.trim();
    if (!name) return;
    onCreateGame(name);
  }

  if (mode === "join") {
    return (
      <Screen>
        <div className="space-y-2">
          <Title>Join a <span className="text-amber-400">Game</span></Title>
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
    return (
      <Screen>
        <div className="space-y-2">
          <Title>Create a <span className="text-amber-400">Game</span></Title>
          <Subtitle>You&apos;ll host — enter your name to join</Subtitle>
        </div>

        <Card className="space-y-4">
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

          <Button
            className="w-full"
            onClick={handleCreate}
            disabled={!playerName.trim() || loading}
          >
            {loading ? "Creating..." : "Create Game"}
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
      <Logo size={140} />
      <div className="space-y-2">
        <Title>
          <span className="text-cyan-400">Two Truths,</span>{" "}
          <span className="text-amber-400">One Who</span>
        </Title>
        <Subtitle>
          Write truths about yourself. Guess who wrote what. Fool everyone.
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
    </Screen>
  );
}
