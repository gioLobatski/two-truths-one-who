"use client";

import { useState } from "react";
import { Button, Card, Screen, Subtitle, Title } from "./ui";
import { Logo } from "./Logo";

export function HomeScreen({
  onCreateGame,
  onJoinGame,
  loading,
}: {
  onCreateGame: () => void;
  onJoinGame: (gameId: string, playerName: string) => void;
  loading: boolean;
}) {
  const [mode, setMode] = useState<"home" | "join">("home");
  const [gameCode, setGameCode] = useState("");
  const [playerName, setPlayerName] = useState("");

  function handleJoin() {
    const code = gameCode.trim();
    const name = playerName.trim();
    if (!code || !name) return;
    onJoinGame(code, name);
  }

  if (mode === "join") {
    return (
      <Screen>
        <div className="space-y-2">
          <Title>Join a Game</Title>
          <Subtitle>Enter the game code and your name</Subtitle>
        </div>

        <Card className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-violet-300/60">
              Game Code
            </label>
            <input
              value={gameCode}
              onChange={(e) => setGameCode(e.target.value)}
              placeholder="Paste the game code"
              className="w-full rounded-xl bg-black/30 px-4 py-3 text-white placeholder-violet-300/40 outline-none ring-1 ring-inset ring-white/10 focus:ring-violet-400"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-violet-300/60">
              Your Name
            </label>
            <input
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              placeholder="What should we call you?"
              maxLength={24}
              className="w-full rounded-xl bg-black/30 px-4 py-3 text-white placeholder-violet-300/40 outline-none ring-1 ring-inset ring-white/10 focus:ring-violet-400"
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
            className="w-full text-center text-sm text-violet-300/60 hover:text-violet-300"
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
        <Title>Two Truths, One Who</Title>
        <Subtitle>
          Write truths about yourself. Guess who wrote what. Fool everyone.
        </Subtitle>
      </div>

      <Card className="space-y-4">
        <Button className="w-full" onClick={onCreateGame} disabled={loading}>
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
