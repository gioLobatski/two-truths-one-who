// Core game types and pure logic for "Two Truths, One Who".
// Everything here is framework-agnostic and side-effect free so it can be
// reused as-is on a server (e.g. Supabase edge functions) when we go multiplayer.

export const TRUTHS_PER_PLAYER = 2;

/** Points a guesser earns for correctly naming the author of a truth. */
export const POINTS_CORRECT_GUESS = 100;
/** Points the author earns for each opponent they fooled (wrong guess). */
export const POINTS_PER_FOOLED = 50;

export type Player = {
  id: string;
  name: string;
  /** The player's own truths. Fixed length of TRUTHS_PER_PLAYER once submitted. */
  truths: string[];
  score: number;
};

/** One randomized reveal: a single truth belonging to one author. */
export type Round = {
  id: string;
  authorId: string;
  truth: string;
  /** guesserId -> the playerId they think is the author. */
  guesses: Record<string, string>;
};

export type Phase =
  | "lobby"
  | "submission"
  | "reveal"
  | "guessing"
  | "roundResult"
  | "gameOver";

export type GameState = {
  phase: Phase;
  players: Player[];
  rounds: Round[];
  currentRoundIndex: number;
};

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

let idCounter = 0;
/** Simple unique id — good enough for a single-device prototype. */
export function makeId(prefix = "id"): string {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${idCounter}`;
}

/** Fisher–Yates shuffle returning a new array (does not mutate input). */
export function shuffle<T>(input: T[]): T[] {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ----------------------------------------------------------------------------
// Game construction
// ----------------------------------------------------------------------------

export function createEmptyGame(): GameState {
  return {
    phase: "lobby",
    players: [],
    rounds: [],
    currentRoundIndex: 0,
  };
}

/** True when every player has filled in all their truths (non-empty). */
export function allTruthsSubmitted(players: Player[]): boolean {
  return (
    players.length > 0 &&
    players.every(
      (p) =>
        p.truths.length === TRUTHS_PER_PLAYER &&
        p.truths.every((t) => t.trim().length > 0),
    )
  );
}

/**
 * Build the randomized list of rounds from all submitted truths.
 * Each (player, truth) pair becomes one round, then the whole list is shuffled.
 */
export function buildRounds(players: Player[]): Round[] {
  const rounds: Round[] = [];
  for (const player of players) {
    for (const truth of player.truths) {
      const text = truth.trim();
      if (text.length === 0) continue;
      rounds.push({
        id: makeId("round"),
        authorId: player.id,
        truth: text,
        guesses: {},
      });
    }
  }
  return shuffle(rounds);
}

// ----------------------------------------------------------------------------
// Scoring
// ----------------------------------------------------------------------------

export type RoundScoreLine = {
  playerId: string;
  reason: string;
  points: number;
};

/**
 * Compute the points awarded for a single round given its guesses.
 * Returns a breakdown so the UI can explain the scoring.
 */
export function scoreRound(round: Round): RoundScoreLine[] {
  const lines: RoundScoreLine[] = [];
  let fooled = 0;

  for (const [guesserId, guessedId] of Object.entries(round.guesses)) {
    if (guesserId === round.authorId) continue; // authors don't guess themselves
    if (guessedId === round.authorId) {
      lines.push({
        playerId: guesserId,
        reason: "Guessed the correct person",
        points: POINTS_CORRECT_GUESS,
      });
    } else {
      fooled += 1;
    }
  }

  if (fooled > 0) {
    lines.push({
      playerId: round.authorId,
      reason: `Stayed hidden — fooled ${fooled} ${fooled === 1 ? "player" : "players"}`,
      points: fooled * POINTS_PER_FOOLED,
    });
  }

  return lines;
}

/** Players who still need to guess in the given round (everyone except author). */
export function pendingGuessers(round: Round, players: Player[]): Player[] {
  return players.filter(
    (p) => p.id !== round.authorId && round.guesses[p.id] === undefined,
  );
}
