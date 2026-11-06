// Supabase service layer for "Fact or Lie" — mirrors supabaseService.ts
// against the fact_or_lie_* tables so game 1's data path stays untouched.

import { supabase } from "./supabase";
import {
  DeckEntry,
  DEFAULT_AVATAR,
  FactOrLieState,
  FolPhase,
  FolPlayer,
  FolRound,
  FolStatement,
  FolVote,
  MIN_PLAYERS,
  STATEMENTS_PER_PLAYER,
  allStatementsSubmitted,
  buildVoteRounds,
  maxRounds,
  scoreVoteRound,
} from "./factOrLie";

// ============================================================================
// Types for database rows
// ============================================================================

export type FolGameRow = {
  id: string;
  phase: FolPhase;
  current_round_index: number;
  created_at: string;
  updated_at: string;
};

export type FolPlayerRow = {
  id: string;
  game_id: string;
  name: string;
  avatar: string;
  score: number;
  created_at: string;
};

export type FolStatementRow = {
  id: string;
  player_id: string;
  text: string;
  declared: FolVote;
  position: number;
  created_at: string;
};

export type FolRoundRow = {
  id: string;
  game_id: string;
  statement_id: string;
  round_index: number;
  created_at: string;
};

export type FolVoteRow = {
  id: string;
  round_id: string;
  voter_id: string;
  vote: FolVote;
  created_at: string;
};

// ============================================================================
// Game creation & joining
// ============================================================================

/** Create a new Fact or Lie game and return its ID. */
export async function createFactOrLieGame(): Promise<string> {
  const { data, error } = await supabase
    .from("fact_or_lie_games")
    .insert({ phase: "lobby" })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to create game: ${error.message}`);
  return data.id;
}

/** Join an existing game as a player. Returns the player row. */
export async function joinFactOrLieGame(
  gameId: string,
  playerName: string,
): Promise<FolPlayerRow> {
  const { data: player, error } = await supabase
    .from("fact_or_lie_players")
    .insert({ game_id: gameId, name: playerName, avatar: DEFAULT_AVATAR })
    .select()
    .single();

  if (error) throw new Error(`Failed to join game: ${error.message}`);

  // Pre-create the two statement slots so submission is a pure upsert
  const { error: slotsError } = await supabase
    .from("fact_or_lie_statements")
    .insert(
      Array.from({ length: STATEMENTS_PER_PLAYER }, (_, position) => ({
        player_id: player.id,
        text: "",
        declared: "fact" as FolVote,
        position,
      })),
    );

  if (slotsError) throw new Error(`Failed to init statements: ${slotsError.message}`);
  return player;
}

/** Check if a Fact or Lie game exists. */
export async function factOrLieGameExists(gameId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("fact_or_lie_games")
    .select("id")
    .eq("id", gameId)
    .single();

  return !error && !!data;
}

// ============================================================================
// Fetch full game state (reconstructs FactOrLieState from DB)
// ============================================================================

export async function fetchFactOrLieState(
  gameId: string,
): Promise<FactOrLieState | null> {
  const { data: game, error: gameError } = await supabase
    .from("fact_or_lie_games")
    .select("*")
    .eq("id", gameId)
    .single();

  if (gameError || !game) return null;

  const { data: players, error: playersError } = await supabase
    .from("fact_or_lie_players")
    .select("*")
    .eq("game_id", gameId)
    .order("created_at", { ascending: true });

  if (playersError)
    throw new Error(`Failed to fetch players: ${playersError.message}`);

  // Statements hang off players, so one fetch covers the whole room
  const playerIds = players?.map((p) => p.id) ?? [];
  let statements: FolStatementRow[] = [];

  if (playerIds.length > 0) {
    const { data: statementData, error: statementsError } = await supabase
      .from("fact_or_lie_statements")
      .select("*")
      .in("player_id", playerIds)
      .order("position", { ascending: true });

    if (statementsError)
      throw new Error(`Failed to fetch statements: ${statementsError.message}`);
    statements = statementData ?? [];
  }

  const { data: rounds, error: roundsError } = await supabase
    .from("fact_or_lie_rounds")
    .select("*")
    .eq("game_id", gameId)
    .order("round_index", { ascending: true });

  if (roundsError)
    throw new Error(`Failed to fetch rounds: ${roundsError.message}`);

  const roundIds = rounds?.map((r) => r.id) ?? [];
  let votes: FolVoteRow[] = [];

  if (roundIds.length > 0) {
    const { data: voteData, error: votesError } = await supabase
      .from("fact_or_lie_votes")
      .select("*")
      .in("round_id", roundIds);

    if (votesError) throw new Error(`Failed to fetch votes: ${votesError.message}`);
    votes = voteData ?? [];
  }

  const statementById = new Map<string, FolStatementRow>(
    statements.map((s) => [s.id, s]),
  );
  const playerById = new Map<string, FolPlayerRow>(
    (players ?? []).map((p) => [p.id, p]),
  );

  const gamePlayers: FolPlayer[] = (players ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    avatar: p.avatar ?? DEFAULT_AVATAR,
    statements: statements
      .filter((s) => s.player_id === p.id)
      .sort((a, b) => a.position - b.position)
      .map(
        (s): FolStatement => ({ id: s.id, text: s.text, declared: s.declared }),
      ),
    score: p.score,
  }));

  const gameRounds: FolRound[] = (rounds ?? []).map((r) => {
    const roundVotes: Record<string, FolVote> = {};
    for (const v of votes) {
      if (v.round_id === r.id) roundVotes[v.voter_id] = v.vote;
    }
    const statement = statementById.get(r.statement_id);
    const author = statement
      ? playerById.get(statement.player_id)
      : undefined;
    return {
      id: r.id,
      statementId: r.statement_id,
      authorId: author?.id ?? "",
      authorName: author?.name ?? "Unknown",
      authorAvatar: author?.avatar ?? DEFAULT_AVATAR,
      text: statement?.text ?? "",
      declared: statement?.declared ?? "fact",
      votes: roundVotes,
    };
  });

  return {
    phase: game.phase,
    players: gamePlayers,
    rounds: gameRounds,
    currentRoundIndex: game.current_round_index,
    phaseStartedAt: game.updated_at,
  };
}

// ============================================================================
// Game actions
// ============================================================================

export async function removeFactOrLiePlayer(playerId: string): Promise<void> {
  const { error } = await supabase
    .from("fact_or_lie_players")
    .delete()
    .eq("id", playerId);

  if (error) throw new Error(`Failed to remove player: ${error.message}`);
}

export async function setFactOrLiePhase(
  gameId: string,
  phase: FolPhase,
): Promise<void> {
  const { error } = await supabase
    .from("fact_or_lie_games")
    .update({ phase, updated_at: new Date().toISOString() })
    .eq("id", gameId);

  if (error) throw new Error(`Failed to set phase: ${error.message}`);
}

/**
 * Upsert both statement slots for a player (text + private fact/lie flag),
 * and optionally store their chosen festive avatar on the players row.
 */
export async function setStatements(
  playerId: string,
  statements: { text: string; declared: FolVote }[],
  avatar?: string,
): Promise<void> {
  const rows = statements.slice(0, STATEMENTS_PER_PLAYER).map((s, position) => ({
    player_id: playerId,
    text: s.text,
    declared: s.declared,
    position,
  }));

  const { error } = await supabase
    .from("fact_or_lie_statements")
    .upsert(rows, { onConflict: "player_id,position" });

  if (error) throw new Error(`Failed to set statements: ${error.message}`);

  if (avatar) {
    const { error: avatarError } = await supabase
      .from("fact_or_lie_players")
      .update({ avatar })
      .eq("id", playerId);

    if (avatarError)
      throw new Error(`Failed to set avatar: ${avatarError.message}`);
  }
}

/**
 * Build the round deck from all players' statements and start the game.
 * The deck is shuffled and cut to roundLimit (never more than 75% of all
 * statements) so the game ends before everything appears.
 */
export async function startFactOrLieGame(
  gameId: string,
  roundLimit?: number,
): Promise<void> {
  const state = await fetchFactOrLieState(gameId);
  if (!state) throw new Error("Game not found");

  // Guard server-side too, in case a client tries to start early
  if (state.players.length < MIN_PLAYERS) {
    throw new Error(`Needs at least ${MIN_PLAYERS} players to start`);
  }
  if (!allStatementsSubmitted(state.players)) {
    throw new Error("Not all statements are in yet");
  }

  // Enforce the cap server-side too, in case a client sends a bogus value
  const capped =
    roundLimit === undefined
      ? undefined
      : Math.min(roundLimit, maxRounds(state.players.length));

  const entries: DeckEntry[] = state.players.flatMap((p) =>
    p.statements
      .filter((s) => s.text.trim().length > 0)
      .map((s) => ({
        authorId: p.id,
        authorName: p.name,
        authorAvatar: p.avatar,
        statementId: s.id,
        text: s.text.trim(),
        declared: s.declared,
      })),
  );

  const rounds = buildVoteRounds(entries, capped);

  const roundRows = rounds.map((r, i) => ({
    game_id: gameId,
    statement_id: r.statementId,
    round_index: i,
  }));

  const { error: insertError } = await supabase
    .from("fact_or_lie_rounds")
    .insert(roundRows);

  if (insertError)
    throw new Error(`Failed to create rounds: ${insertError.message}`);

  // Statement display comes first; the host opens the vote window from the
  // reveal screen so the shared deadline starts on their click (game 1 parity)
  await setFactOrLiePhase(gameId, "reveal");
}

export async function submitVote(
  roundId: string,
  voterId: string,
  vote: FolVote,
): Promise<void> {
  const { error } = await supabase
    .from("fact_or_lie_votes")
    .upsert(
      { round_id: roundId, voter_id: voterId, vote },
      { onConflict: "round_id,voter_id" },
    );

  if (error) throw new Error(`Failed to submit vote: ${error.message}`);
}

/** Score the current round and update player scores. */
export async function scoreFactOrLieCurrentRound(gameId: string): Promise<void> {
  const state = await fetchFactOrLieState(gameId);
  if (!state) throw new Error("Game not found");

  const round = state.rounds[state.currentRoundIndex];
  if (!round) return;

  const lines = scoreVoteRound(round);

  for (const line of lines) {
    const player = state.players.find((p) => p.id === line.playerId);
    if (!player) continue;

    const { error } = await supabase
      .from("fact_or_lie_players")
      .update({ score: player.score + line.points })
      .eq("id", line.playerId);

    if (error) throw new Error(`Failed to update score: ${error.message}`);
  }

  await setFactOrLiePhase(gameId, "roundResult");
}

export async function nextFactOrLieRound(gameId: string): Promise<void> {
  const state = await fetchFactOrLieState(gameId);
  if (!state) throw new Error("Game not found");

  const next = state.currentRoundIndex + 1;

  if (next >= state.rounds.length) {
    await setFactOrLiePhase(gameId, "gameOver");
  } else {
    const { error } = await supabase
      .from("fact_or_lie_games")
      .update({
        current_round_index: next,
        phase: "reveal",
        updated_at: new Date().toISOString(),
      })
      .eq("id", gameId);

    if (error) throw new Error(`Failed to advance round: ${error.message}`);
  }
}

export async function resetFactOrLieGame(gameId: string): Promise<void> {
  const { data: rounds } = await supabase
    .from("fact_or_lie_rounds")
    .select("id")
    .eq("game_id", gameId);

  const roundIds = rounds?.map((r) => r.id) ?? [];

  if (roundIds.length > 0) {
    await supabase.from("fact_or_lie_votes").delete().in("round_id", roundIds);
  }
  await supabase.from("fact_or_lie_rounds").delete().eq("game_id", gameId);
  // Statements cascade with players
  await supabase.from("fact_or_lie_players").delete().eq("game_id", gameId);

  await supabase
    .from("fact_or_lie_games")
    .update({
      phase: "lobby",
      current_round_index: 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", gameId);
}
