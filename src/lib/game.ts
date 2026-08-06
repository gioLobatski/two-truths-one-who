// Core game types and pure logic for "Two Truths, One Who".
// Everything here is framework-agnostic and side-effect free so it can be
// reused as-is on a server (e.g. Supabase edge functions) when we go multiplayer.

export const TRUTHS_PER_PLAYER = 2;

/**
 * Minimum participating players. The room creator may choose to moderate
 * instead of playing, so the player list itself must always hold at least
 * three participants for the deduction loop to work.
 */
export const MIN_PLAYERS = 3;

/** Points a guesser earns for correctly naming the author of a truth. */
export const POINTS_CORRECT_GUESS = 100;
/** Points the author earns for each opponent they fooled (wrong guess). */
export const POINTS_PER_FOOLED = 50;

/**
 * Diminishing author multiplier by appearance order: an author's first
 * revealed truth pays ×0.5 of the base fooling reward, their second (and any
 * later) appearance pays ×0.25. This compresses the surplus of players who
 * draw bonus truths from the random deck fill.
 * NOTE: this curve only touches author income. If big-room playtesting ever
 * shows guessers snowballing, tune POINTS_CORRECT_GUESS instead.
 */
export const AUTHOR_MULTIPLIER_FIRST = 0.5;
export const AUTHOR_MULTIPLIER_SECOND = 0.25;

/** Author multiplier for a 1-based appearance number. */
export function authorMultiplier(appearance: number): number {
  return appearance <= 1 ? AUTHOR_MULTIPLIER_FIRST : AUTHOR_MULTIPLIER_SECOND;
}

/** How many times the author of the round at roundIndex has appeared so far (1-based). */
export function authorAppearance(rounds: Round[], roundIndex: number): number {
  const authorId = rounds[roundIndex]?.authorId;
  if (!authorId) return 1;
  let count = 0;
  for (let i = 0; i <= roundIndex; i++) {
    if (rounds[i].authorId === authorId) count += 1;
  }
  return count;
}

/**
 * The deck is capped at this fraction of all submitted truths. Ending before
 * every truth is revealed means players can never eliminate candidates by
 * tracking whose truths have already shown up.
 */
export const ROUND_CAP_RATIO = 0.75;

/** Maximum rounds allowed for a player count (75% of total truths). */
export function maxRounds(playerCount: number): number {
  return Math.max(1, Math.floor(playerCount * TRUTHS_PER_PLAYER * ROUND_CAP_RATIO));
}

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
 * Build the randomized round list from all submitted truths.
 * Every player is guaranteed at least one truth in the deck when the round
 * limit allows it; remaining slots up to roundLimit are filled randomly from
 * the surplus truths. The deck is shuffled and cut so the game ends before
 * every truth appears — keeping deduction by elimination impossible.
 */
export function buildRounds(players: Player[], roundLimit?: number): Round[] {
  // Shuffled candidate truths per player, so the guaranteed pick is random too
  const perPlayer = players.map((p) =>
    shuffle(
      p.truths
        .map((truth) => truth.trim())
        .filter((truth) => truth.length > 0)
        .map((truth) => ({ authorId: p.id, truth })),
    ),
  );

  const total = perPlayer.reduce((sum, truths) => sum + truths.length, 0);
  const limit =
    roundLimit === undefined ? total : Math.max(1, Math.min(roundLimit, total));
  const withTruths = perPlayer.filter((truths) => truths.length > 0);

  const picked: { authorId: string; truth: string }[] = [];

  if (limit >= withTruths.length) {
    // Guarantee one truth per player, then fill the rest from random surplus
    for (const truths of withTruths) picked.push(truths[0]);
    const leftovers = withTruths.flatMap((truths) => truths.slice(1));
    picked.push(...shuffle(leftovers).slice(0, limit - picked.length));
  } else {
    // Short game: fewer rounds than players — spread truths across as many
    // distinct players as the round count allows
    picked.push(
      ...shuffle(withTruths)
        .slice(0, limit)
        .map((truths) => truths[0]),
    );
  }

  return shuffle(picked).map((entry) => ({
    id: makeId("round"),
    authorId: entry.authorId,
    truth: entry.truth,
    guesses: {},
  }));
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
 * `appearance` is which time this author's truth shows up (1-based) — the
 * author's fooling reward is scaled by the diminishing author multiplier.
 * Returns a breakdown so the UI can explain the scoring.
 */
export function scoreRound(round: Round, appearance: number): RoundScoreLine[] {
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
    const mult = authorMultiplier(appearance);
    lines.push({
      playerId: round.authorId,
      reason: `Stayed hidden — fooled ${fooled} ${fooled === 1 ? "player" : "players"} (×${mult})`,
      points: Math.round(fooled * POINTS_PER_FOOLED * mult),
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
