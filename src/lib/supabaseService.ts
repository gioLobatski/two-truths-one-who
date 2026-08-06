// Supabase service layer — maps game actions to database operations.
// Each function corresponds to a reducer action in gameReducer.ts.

import { supabase } from "./supabase";
import { GameState, MIN_PLAYERS, Phase, Player, Round, authorAppearance, buildRounds, maxRounds, scoreRound, TRUTHS_PER_PLAYER } from "./game";

// ============================================================================
// Types for database rows
// ============================================================================

export type GameRow = {
  id: string;
  phase: Phase;
  current_round_index: number;
  created_at: string;
  updated_at: string;
};

export type PlayerRow = {
  id: string;
  game_id: string;
  name: string;
  truths: string[];
  score: number;
  created_at: string;
};

export type RoundRow = {
  id: string;
  game_id: string;
  author_id: string;
  truth: string;
  round_index: number;
  created_at: string;
};

export type GuessRow = {
  id: string;
  round_id: string;
  guesser_id: string;
  guessed_id: string;
  created_at: string;
};

// ============================================================================
// Game creation & joining
// ============================================================================

/** Create a new game and return its ID. */
export async function createGame(): Promise<string> {
  const { data, error } = await supabase
    .from("games")
    .insert({ phase: "lobby" })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to create game: ${error.message}`);
  return data.id;
}

/** Join an existing game as a player. Returns the player row. */
export async function joinGame(gameId: string, playerName: string): Promise<PlayerRow> {
  const { data, error } = await supabase
    .from("players")
    .insert({
      game_id: gameId,
      name: playerName,
      truths: Array(TRUTHS_PER_PLAYER).fill(""),
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to join game: ${error.message}`);
  return data;
}

/** Check if a game exists. */
export async function gameExists(gameId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("games")
    .select("id")
    .eq("id", gameId)
    .single();

  return !error && !!data;
}

// ============================================================================
// Fetch full game state (reconstructs GameState from DB)
// ============================================================================

export async function fetchGameState(gameId: string): Promise<GameState | null> {
  // Fetch game
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("*")
    .eq("id", gameId)
    .single();

  if (gameError || !game) return null;

  // Fetch players
  const { data: players, error: playersError } = await supabase
    .from("players")
    .select("*")
    .eq("game_id", gameId)
    .order("created_at", { ascending: true });

  if (playersError) throw new Error(`Failed to fetch players: ${playersError.message}`);

  // Fetch rounds
  const { data: rounds, error: roundsError } = await supabase
    .from("rounds")
    .select("*")
    .eq("game_id", gameId)
    .order("round_index", { ascending: true });

  if (roundsError) throw new Error(`Failed to fetch rounds: ${roundsError.message}`);

  // Fetch all guesses for this game's rounds
  const roundIds = rounds?.map((r) => r.id) ?? [];
  let guesses: GuessRow[] = [];

  if (roundIds.length > 0) {
    const { data: guessData, error: guessError } = await supabase
      .from("guesses")
      .select("*")
      .in("round_id", roundIds);

    if (guessError) throw new Error(`Failed to fetch guesses: ${guessError.message}`);
    guesses = guessData ?? [];
  }

  // Reconstruct GameState
  const gamePlayers: Player[] = (players ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    truths: p.truths ?? [],
    score: p.score,
  }));

  const gameRounds: Round[] = (rounds ?? []).map((r) => {
    const roundGuesses: Record<string, string> = {};
    for (const g of guesses) {
      if (g.round_id === r.id) {
        roundGuesses[g.guesser_id] = g.guessed_id;
      }
    }
    return {
      id: r.id,
      authorId: r.author_id,
      truth: r.truth,
      guesses: roundGuesses,
    };
  });

  return {
    phase: game.phase,
    players: gamePlayers,
    rounds: gameRounds,
    currentRoundIndex: game.current_round_index,
  };
}

// ============================================================================
// Game actions (mirror reducer actions)
// ============================================================================

export async function addPlayer(gameId: string, name: string): Promise<void> {
  await joinGame(gameId, name);
}

export async function removePlayer(playerId: string): Promise<void> {
  const { error } = await supabase
    .from("players")
    .delete()
    .eq("id", playerId);

  if (error) throw new Error(`Failed to remove player: ${error.message}`);
}

export async function setPhase(gameId: string, phase: Phase): Promise<void> {
  const { error } = await supabase
    .from("games")
    .update({ phase, updated_at: new Date().toISOString() })
    .eq("id", gameId);

  if (error) throw new Error(`Failed to set phase: ${error.message}`);
}

export async function setTruths(playerId: string, truths: string[]): Promise<void> {
  const { error } = await supabase
    .from("players")
    .update({ truths: truths.slice(0, TRUTHS_PER_PLAYER) })
    .eq("id", playerId);

  if (error) throw new Error(`Failed to set truths: ${error.message}`);
}

/** Build rounds from all players' truths and start the game.
 * The deck is shuffled and cut to roundLimit (never more than 75% of all
 * truths) so players can't deduce authors by elimination. */
export async function startGame(gameId: string, roundLimit?: number): Promise<void> {
  const state = await fetchGameState(gameId);
  if (!state) throw new Error("Game not found");

  // Guard server-side too, in case a client tries to start early
  if (state.players.length < MIN_PLAYERS) {
    throw new Error(`Needs at least ${MIN_PLAYERS} players to start`);
  }

  // Enforce the cap server-side too, in case a client sends a bogus value
  const capped =
    roundLimit === undefined
      ? undefined
      : Math.min(roundLimit, maxRounds(state.players.length));

  const rounds = buildRounds(state.players, capped);

  // Insert rounds
  const roundRows = rounds.map((r, i) => ({
    game_id: gameId,
    author_id: r.authorId,
    truth: r.truth,
    round_index: i,
  }));

  const { error: insertError } = await supabase
    .from("rounds")
    .insert(roundRows);

  if (insertError) throw new Error(`Failed to create rounds: ${insertError.message}`);

  // Update game phase
  await setPhase(gameId, "reveal");
}

export async function submitGuess(roundId: string, guesserId: string, guessedId: string): Promise<void> {
  const { error } = await supabase
    .from("guesses")
    .upsert(
      { round_id: roundId, guesser_id: guesserId, guessed_id: guessedId },
      { onConflict: "round_id,guesser_id" }
    );

  if (error) throw new Error(`Failed to submit guess: ${error.message}`);
}

/** Score the current round and update player scores. */
export async function scoreCurrentRound(gameId: string): Promise<void> {
  const state = await fetchGameState(gameId);
  if (!state) throw new Error("Game not found");

  const round = state.rounds[state.currentRoundIndex];
  if (!round) return;

  const lines = scoreRound(
    round,
    authorAppearance(state.rounds, state.currentRoundIndex)
  );

  // Update each player's score
  for (const line of lines) {
    const player = state.players.find((p) => p.id === line.playerId);
    if (!player) continue;

    const { error } = await supabase
      .from("players")
      .update({ score: player.score + line.points })
      .eq("id", line.playerId);

    if (error) throw new Error(`Failed to update score: ${error.message}`);
  }

  // Move to roundResult phase
  await setPhase(gameId, "roundResult");
}

export async function nextRound(gameId: string): Promise<void> {
  const state = await fetchGameState(gameId);
  if (!state) throw new Error("Game not found");

  const next = state.currentRoundIndex + 1;

  if (next >= state.rounds.length) {
    await setPhase(gameId, "gameOver");
  } else {
    const { error } = await supabase
      .from("games")
      .update({
        current_round_index: next,
        phase: "reveal",
        updated_at: new Date().toISOString(),
      })
      .eq("id", gameId);

    if (error) throw new Error(`Failed to advance round: ${error.message}`);
  }
}

export async function resetGame(gameId: string): Promise<void> {
  // Get all round IDs for this game
  const { data: rounds } = await supabase
    .from("rounds")
    .select("id")
    .eq("game_id", gameId);

  const roundIds = rounds?.map((r) => r.id) ?? [];

  // Delete all related data
  if (roundIds.length > 0) {
    await supabase.from("guesses").delete().in("round_id", roundIds);
  }
  await supabase.from("rounds").delete().eq("game_id", gameId);
  await supabase.from("players").delete().eq("game_id", gameId);

  // Reset game
  await supabase
    .from("games")
    .update({ phase: "lobby", current_round_index: 0, updated_at: new Date().toISOString() })
    .eq("id", gameId);
}
