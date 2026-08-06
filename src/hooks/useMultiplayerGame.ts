"use client";

// Custom hook for multiplayer game state with Supabase realtime sync.

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { GameState } from "@/lib/game";
import {
  addPlayer,
  fetchGameState,
  nextRound,
  removePlayer,
  scoreCurrentRound,
  setPhase,
  setTruths,
  startGame,
  submitGuess,
} from "@/lib/supabaseService";

export type MultiplayerActions = {
  addPlayer: (name: string) => Promise<void>;
  removePlayer: (playerId: string) => Promise<void>;
  startSubmission: () => Promise<void>;
  setTruths: (playerId: string, truths: string[]) => Promise<void>;
  startGame: (roundCount?: number) => Promise<void>;
  revealRound: () => Promise<void>;
  submitGuess: (guesserId: string, guessedId: string) => Promise<void>;
  scoreRound: () => Promise<void>;
  nextRound: () => Promise<void>;
};

export function useMultiplayerGame(gameId: string | null) {
  const [state, setState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Fetch initial state
  const refresh = useCallback(async () => {
    if (!gameId) return;
    try {
      const gameState = await fetchGameState(gameId);
      setState(gameState);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch game state");
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  // Initial fetch + realtime subscription
  useEffect(() => {
    if (!gameId) {
      setLoading(false);
      return;
    }

    refresh();

    // Subscribe to realtime changes on all game-related tables
    const channel = supabase
      .channel(`game-${gameId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "games", filter: `id=eq.${gameId}` },
        () => refresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players", filter: `game_id=eq.${gameId}` },
        () => refresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rounds", filter: `game_id=eq.${gameId}` },
        () => refresh()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, refresh]);

  // Guesses have no game_id column, so scope this subscription to this game's
  // round ids instead of listening to every guess in every room.
  const roundIdsKey = (state?.rounds ?? []).map((r) => r.id).join(",");

  useEffect(() => {
    if (!gameId || !roundIdsKey) return;

    const channel = supabase
      .channel(`game-${gameId}-guesses`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "guesses", filter: `round_id=in.(${roundIdsKey})` },
        () => refresh()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, roundIdsKey, refresh]);

  // Action wrappers that call Supabase and optimistically update
  const actions: MultiplayerActions = {
    addPlayer: useCallback(
      async (name: string) => {
        if (!gameId) return;
        await addPlayer(gameId, name);
        await refresh();
      },
      [gameId, refresh]
    ),

    removePlayer: useCallback(
      async (playerId: string) => {
        await removePlayer(playerId);
        await refresh();
      },
      [refresh]
    ),

    startSubmission: useCallback(async () => {
      if (!gameId) return;
      await setPhase(gameId, "submission");
      await refresh();
    }, [gameId, refresh]),

    setTruths: useCallback(
      async (playerId: string, truths: string[]) => {
        await setTruths(playerId, truths);
        await refresh();
      },
      [refresh]
    ),

    startGame: useCallback(
      async (roundCount?: number) => {
        if (!gameId) return;
        await startGame(gameId, roundCount);
        await refresh();
      },
      [gameId, refresh]
    ),

    revealRound: useCallback(async () => {
      if (!gameId) return;
      await setPhase(gameId, "guessing");
      await refresh();
    }, [gameId, refresh]),

    submitGuess: useCallback(
      async (guesserId: string, guessedId: string) => {
        const current = stateRef.current;
        if (!current) return;
        const round = current.rounds[current.currentRoundIndex];
        if (!round) return;
        await submitGuess(round.id, guesserId, guessedId);
        await refresh();
      },
      [refresh]
    ),

    scoreRound: useCallback(async () => {
      if (!gameId) return;
      await scoreCurrentRound(gameId);
      await refresh();
    }, [gameId, refresh]),

    nextRound: useCallback(async () => {
      if (!gameId) return;
      await nextRound(gameId);
      await refresh();
    }, [gameId, refresh]),
  };

  return { state, loading, error, actions };
}
