"use client";

import { useCallback, useEffect, useState } from "react";
import { createGame, joinGame, gameExists } from "@/lib/supabaseService";
import { useMultiplayerGame } from "@/hooks/useMultiplayerGame";
import { HomeScreen } from "@/components/HomeScreen";
import { LobbyScreen } from "@/components/LobbyScreen";
import { SubmissionScreen } from "@/components/SubmissionScreen";
import { GuessingScreen } from "@/components/GuessingScreen";
import { RoundResultScreen } from "@/components/RoundResultScreen";
import { GameOverScreen } from "@/components/GameOverScreen";
import { SplashScreen } from "@/components/SplashScreen";
import { Logo } from "@/components/Logo";

// Store current player ID in localStorage for identity across refreshes
const PLAYER_ID_KEY = "two-truths-player-id";
const GAME_ID_KEY = "two-truths-game-id";

function getStored(key: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(key);
}

function setStored(key: string, value: string) {
  localStorage.setItem(key, value);
}

function clearStored() {
  localStorage.removeItem(PLAYER_ID_KEY);
  localStorage.removeItem(GAME_ID_KEY);
}

export default function Home() {
  const [gameId, setGameId] = useState<string | null>(getStored(GAME_ID_KEY));
  const [playerId, setPlayerId] = useState<string | null>(getStored(PLAYER_ID_KEY));
  const [isHost, setIsHost] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSplash, setShowSplash] = useState(true);

  const { state, loading: stateLoading, actions } = useMultiplayerGame(gameId);

  // Show the splash screen briefly when the app first opens
  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 1800);
    return () => clearTimeout(timer);
  }, []);

  // Create a new game
  const handleCreateGame = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const id = await createGame();
      setStored(GAME_ID_KEY, id);
      setGameId(id);
      setIsHost(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create game");
    } finally {
      setLoading(false);
    }
  }, []);

  // Join an existing game
  const handleJoinGame = useCallback(async (code: string, name: string) => {
    setLoading(true);
    setError(null);
    try {
      const exists = await gameExists(code);
      if (!exists) {
        setError("Game not found. Check the code and try again.");
        return;
      }
      const player = await joinGame(code, name);
      setStored(GAME_ID_KEY, code);
      setStored(PLAYER_ID_KEY, player.id);
      setGameId(code);
      setPlayerId(player.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join game");
    } finally {
      setLoading(false);
    }
  }, []);

  // Leave game
  const handleLeave = useCallback(() => {
    clearStored();
    setGameId(null);
    setPlayerId(null);
    setIsHost(false);
  }, []);

  if (showSplash) {
    return <SplashScreen />;
  }

  // Show home screen if no game
  if (!gameId) {
    return (
      <HomeScreen
        onCreateGame={handleCreateGame}
        onJoinGame={handleJoinGame}
        loading={loading}
      />
    );
  }

  // Loading state
  if (stateLoading || !state) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6">
        <Logo size={160} className="animate-pulse" />
        <p className="text-violet-200/70 animate-pulse">Loading game...</p>
      </div>
    );
  }

  const currentRound = state.rounds[state.currentRoundIndex];
  const isLastRound = state.currentRoundIndex === state.rounds.length - 1;

  switch (state.phase) {
    case "lobby":
      return (
        <LobbyScreen
          gameId={gameId}
          players={state.players}
          isHost={isHost}
          onStart={() => actions.startSubmission()}
          onLeave={handleLeave}
        />
      );

    case "submission":
      return (
        <SubmissionScreen
          players={state.players}
          playerId={playerId}
          onSetTruths={(pid, truths) => actions.setTruths(pid, truths)}
          onStartGame={() => actions.startGame()}
          isHost={isHost}
        />
      );

    case "reveal":
    case "guessing":
      if (!currentRound) return null;
      return (
        <GuessingScreen
          round={currentRound}
          players={state.players}
          playerId={playerId}
          roundNumber={state.currentRoundIndex + 1}
          totalRounds={state.rounds.length}
          phase={state.phase}
          onReveal={() => actions.revealRound()}
          onSubmitGuess={(guesserId, guessedId) => actions.submitGuess(guesserId, guessedId)}
          onScore={() => actions.scoreRound()}
          isHost={isHost}
        />
      );

    case "roundResult":
      if (!currentRound) return null;
      return (
        <RoundResultScreen
          round={currentRound}
          players={state.players}
          isLastRound={isLastRound}
          onNext={() => actions.nextRound()}
          isHost={isHost}
        />
      );

    case "gameOver":
      return (
        <GameOverScreen
          players={state.players}
          onPlayAgain={handleLeave}
        />
      );

    default:
      return null;
  }
}
