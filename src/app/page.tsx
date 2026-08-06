"use client";

import { useCallback, useState } from "react";
import { createGame, joinGame, gameExists } from "@/lib/supabaseService";
import { authorAppearance } from "@/lib/game";
import { useMultiplayerGame } from "@/hooks/useMultiplayerGame";
import { HomeScreen } from "@/components/HomeScreen";
import { LobbyScreen } from "@/components/LobbyScreen";
import { SubmissionScreen } from "@/components/SubmissionScreen";
import { GuessingScreen } from "@/components/GuessingScreen";
import { RoundResultScreen } from "@/components/RoundResultScreen";
import { GameOverScreen } from "@/components/GameOverScreen";
import { SplashScreen } from "@/components/SplashScreen";
import { LoadingScreen } from "@/components/LoadingScreen";

// Store current player ID in localStorage for identity across refreshes
const PLAYER_ID_KEY = "two-truths-player-id";
const GAME_ID_KEY = "two-truths-game-id";
const HOST_KEY = "two-truths-is-host";

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
  localStorage.removeItem(HOST_KEY);
}

export default function Home() {
  const [gameId, setGameId] = useState<string | null>(getStored(GAME_ID_KEY));
  const [playerId, setPlayerId] = useState<string | null>(getStored(PLAYER_ID_KEY));
  const [isHost, setIsHost] = useState(() => getStored(HOST_KEY) === "1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSplash, setShowSplash] = useState(true);

  const { state, loading: stateLoading, actions } = useMultiplayerGame(gameId);

  // Create a new game — the creator joins as a player so they can play too
  const handleCreateGame = useCallback(async (name: string) => {
    setLoading(true);
    setError(null);
    try {
      const id = await createGame();
      const player = await joinGame(id, name);
      setStored(GAME_ID_KEY, id);
      setStored(PLAYER_ID_KEY, player.id);
      setStored(HOST_KEY, "1");
      setGameId(id);
      setPlayerId(player.id);
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
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
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
    return <LoadingScreen label="Loading game" />;
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
          onStartGame={(roundCount) => actions.startGame(roundCount)}
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
          authorAppearance={authorAppearance(state.rounds, state.currentRoundIndex)}
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
