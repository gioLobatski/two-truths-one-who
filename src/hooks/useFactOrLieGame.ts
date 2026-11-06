"use client";

// Custom hook for Fact or Lie game state with Supabase realtime sync.
// Same shape as useMultiplayerGame: fetch-on-change subscriptions plus
// wrapped actions, pointed at the fact_or_lie_* tables.

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { FactOrLieState, FolVote, VOTE_TIME_LIMIT } from "@/lib/factOrLie";
import {
  fetchFactOrLieState,
  nextFactOrLieRound,
  removeFactOrLiePlayer,
  scoreFactOrLieCurrentRound,
  setFactOrLiePhase,
  setStatements,
  startFactOrLieGame,
  submitVote,
} from "@/lib/factOrLieService";

export type FactOrLieActions = {
  removePlayer: (playerId: string) => Promise<void>;
  startSubmission: () => Promise<void>;
  setStatements: (
    playerId: string,
    statements: { text: string; declared: FolVote }[],
    avatar?: string,
  ) => Promise<void>;
  startGame: (roundCount?: number) => Promise<void>;
  startVoting: () => Promise<void>;
  submitVote: (voterId: string, vote: FolVote) => Promise<void>;
  scoreRound: () => Promise<void>;
  nextRound: () => Promise<void>;
};

export function useFactOrLieGame(gameId: string | null) {
  const [state, setState] = useState<FactOrLieState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Fetch initial state
  const refresh = useCallback(async () => {
    if (!gameId) return;
    try {
      const gameState = await fetchFactOrLieState(gameId);
      setState(gameState);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch game state",
      );
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  // Initial fetch + realtime subscription on the game's own tables
  useEffect(() => {
    if (!gameId) {
      setLoading(false);
      return;
    }

    refresh();

    const channel = supabase
      .channel(`fol-game-${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "fact_or_lie_games",
          filter: `id=eq.${gameId}`,
        },
        () => refresh(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "fact_or_lie_players",
          filter: `game_id=eq.${gameId}`,
        },
        () => refresh(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "fact_or_lie_rounds",
          filter: `game_id=eq.${gameId}`,
        },
        () => refresh(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "fact_or_lie_statements",
        },
        () => refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, refresh]);

  // Votes have no game_id column, so scope this subscription to this game's
  // round ids instead of listening to every vote in every room.
  const roundIdsKey = (state?.rounds ?? []).map((r) => r.id).join(",");

  useEffect(() => {
    if (!gameId || !roundIdsKey) return;

    const channel = supabase
      .channel(`fol-game-${gameId}-votes`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "fact_or_lie_votes",
          filter: `round_id=in.(${roundIdsKey})`,
        },
        () => refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, roundIdsKey, refresh]);

  // Action wrappers that call Supabase and refresh after
  const actions: FactOrLieActions = {
    removePlayer: useCallback(
      async (playerId: string) => {
        await removeFactOrLiePlayer(playerId);
        await refresh();
      },
      [refresh],
    ),

    startSubmission: useCallback(async () => {
      if (!gameId) return;
      await setFactOrLiePhase(gameId, "submission");
      await refresh();
    }, [gameId, refresh]),

    setStatements: useCallback(
      async (
        playerId: string,
        statements: { text: string; declared: FolVote }[],
        avatar?: string,
      ) => {
        await setStatements(playerId, statements, avatar);
        await refresh();
      },
      [refresh],
    ),

    startGame: useCallback(
      async (roundCount?: number) => {
        if (!gameId) return;
        await startFactOrLieGame(gameId, roundCount);
        await refresh();
      },
      [gameId, refresh],
    ),

    startVoting: useCallback(async () => {
      if (!gameId) return;
      // Opens the vote window — updated_at becomes the shared deadline anchor
      await setFactOrLiePhase(gameId, "voting");
      await refresh();
    }, [gameId, refresh]),

    submitVote: useCallback(
      async (voterId: string, vote: FolVote) => {
        const current = stateRef.current;
        if (!current) return;
        const round = current.rounds[current.currentRoundIndex];
        if (!round) return;
        // Reject votes that arrive after the voting window has closed
        if (current.phase === "voting" && current.phaseStartedAt) {
          const deadline =
            Date.parse(current.phaseStartedAt) + VOTE_TIME_LIMIT * 1000;
          if (Date.now() > deadline) return;
        }
        await submitVote(round.id, voterId, vote);
        await refresh();
      },
      [refresh],
    ),

    scoreRound: useCallback(async () => {
      if (!gameId) return;
      await scoreFactOrLieCurrentRound(gameId);
      await refresh();
    }, [gameId, refresh]),

    nextRound: useCallback(async () => {
      if (!gameId) return;
      await nextFactOrLieRound(gameId);
      await refresh();
    }, [gameId, refresh]),
  };

  return { state, loading, error, actions };
}
