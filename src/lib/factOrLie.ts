// Core game types and pure logic for "Fact or Lie" (working title).
// Same deal as game.ts: framework-agnostic and side-effect free, so it can
// be reused as-is on a server when we move round building/scoring there.

export const STATEMENTS_PER_PLAYER = 2;

/**
 * Minimum participating players. The room creator may moderate instead of
 * playing, so this counts real players only — same rule as game 1.
 */
export const MIN_PLAYERS = 3;

/** Points a voter earns for calling a statement correctly. */
export const POINTS_CORRECT_VOTE = 100;
/** Points the author earns for each player who voted wrong. */
export const POINTS_PER_FOOLED = 50;
/** Points the author earns each time a warned-out player skips the vote. */
export const POINTS_NAUGHTY_PENALTY = 25;

/** The naughty-list message shown whenever a miss is flagged. */
export const NAUGHTY_COPY = "Santa has seen you: NAUGHTY!";

/**
 * Seconds players get to lock in their vote each round. Kept short on
 * purpose: no time to paste the statement into a search engine or an LLM
 * and still press a button — but long enough to not feel punishing.
 */
export const VOTE_TIME_LIMIT = 10;

/**
 * How many free warnings a no-show voter gets before penalties kick in,
 * scaled to room size: small rooms can afford to be forgiving, big rooms
 * can't let half the crowd coast. Past the threshold, every further miss
 * pays the presenter POINTS_NAUGHTY_PENALTY for the rest of the game.
 */
export function warningThreshold(playerCount: number): number {
  if (playerCount < 5) return 1;
  if (playerCount < 10) return 2;
  return 3;
}

/**
 * The deck is capped at this fraction of all submitted statements — same
 * fairness rule as game 1, so a short game can't be counted down card-style.
 */
export const ROUND_CAP_RATIO = 0.75;

/** Maximum rounds allowed for a player count (75% of total statements). */
export function maxRounds(playerCount: number): number {
  return Math.max(
    1,
    Math.floor(playerCount * STATEMENTS_PER_PLAYER * ROUND_CAP_RATIO),
  );
}

/** The author's private claim, revealed only at scoring time. */
export type FolVote = "fact" | "lie";

/**
 * Festive avatar set shown in the gingerbread man's hollow head. A player
 * picks one at submission; it is stored on the players row. Kept as plain
 * emoji so it needs no image assets and renders everywhere.
 */
export const AVATAR_OPTIONS = [
  "🎃",
  "👻",
  "🧟",
  "🧙",
  "🦇",
  "🕷️",
  "🍬",
  "🍭",
  "🎄",
  "⛄",
  "🎅",
  "🦌",
] as const;

export type FolAvatar = (typeof AVATAR_OPTIONS)[number];

export const DEFAULT_AVATAR: FolAvatar = "🎃";

export type FolStatement = {
  /** DB id — rounds reference statements, not free text. */
  id: string;
  text: string;
  declared: FolVote;
};

export type FolPlayer = {
  id: string;
  name: string;
  /** Festive emoji shown in the gingerbread head for this player. */
  avatar: string;
  /** The player's own statements. Fixed length of STATEMENTS_PER_PLAYER once submitted. */
  statements: FolStatement[];
  score: number;
  /** Rounds this player skipped without voting — drives warnings/penalties. */
  missedVotes: number;
};

/** One randomized reveal: a single statement belonging to one (visible) author. */
export type FolRound = {
  id: string;
  statementId: string;
  authorId: string;
  authorName: string;
  /** Author's festive avatar, joined in for the gingerbread head. */
  authorAvatar: string;
  text: string;
  /** Author's private claim — must not reach voter UIs before scoring. */
  declared: FolVote;
  /** voterId -> their Fact/Lie call. */
  votes: Record<string, FolVote>;
};

export type FolPhase =
  | "lobby"
  | "submission"
  | "reveal"
  | "voting"
  | "roundResult"
  | "gameOver";

export type FactOrLieState = {
  phase: FolPhase;
  players: FolPlayer[];
  rounds: FolRound[];
  currentRoundIndex: number;
  /**
   * When the current phase began (ISO timestamp). Sourced from the games
   * row's updated_at, so every client derives the same vote deadline.
   */
  phaseStartedAt: string | null;
};

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

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

export function createEmptyFactOrLieGame(): FactOrLieState {
  return {
    phase: "lobby",
    players: [],
    rounds: [],
    currentRoundIndex: 0,
    phaseStartedAt: null,
  };
}

/** True when every player has filled in all their statements (non-empty). */
export function allStatementsSubmitted(players: FolPlayer[]): boolean {
  return (
    players.length > 0 &&
    players.every(
      (p) =>
        p.statements.length === STATEMENTS_PER_PLAYER &&
        p.statements.every((s) => s.text.trim().length > 0),
    )
  );
}

/** Flattened statement + owning player, the unit the deck is built from. */
export type DeckEntry = {
  authorId: string;
  authorName: string;
  authorAvatar: string;
  statementId: string;
  text: string;
  declared: FolVote;
};

/**
 * Build the randomized round deck from all submitted statements.
 * Every player is guaranteed at least one statement in the deck when the
 * round limit allows it; remaining slots are filled randomly from the
 * surplus, then the deck is shuffled and cut. Mirrors game 1's buildRounds
 * but keeps the statement id + declared flag attached for scoring.
 */
export function buildVoteRounds(
  entries: DeckEntry[],
  roundLimit?: number,
): FolRound[] {
  // Group by author so the per-player guarantee works on distinct people
  const byAuthor = new Map<string, DeckEntry[]>();
  for (const e of entries) {
    const list = byAuthor.get(e.authorId) ?? [];
    list.push(e);
    byAuthor.set(e.authorId, list);
  }
  const perAuthor = [...byAuthor.values()].map((list) => shuffle(list));

  const total = entries.length;
  const limit =
    roundLimit === undefined ? total : Math.max(1, Math.min(roundLimit, total));
  const withStatements = perAuthor.filter((list) => list.length > 0);

  const picked: DeckEntry[] = [];

  if (limit >= withStatements.length) {
    // Guarantee one statement per player, then fill the rest from random surplus
    for (const list of withStatements) picked.push(list[0]);
    const leftovers = withStatements.flatMap((list) => list.slice(1));
    picked.push(...shuffle(leftovers).slice(0, limit - picked.length));
  } else {
    // Short deck: fewer rounds than players — spread as many distinct
    // authors as the round count allows
    picked.push(
      ...shuffle(withStatements)
        .slice(0, limit)
        .map((list) => list[0]),
    );
  }

  return shuffle(picked).map((entry) => ({
    id: `folround_${entry.statementId}`,
    statementId: entry.statementId,
    authorId: entry.authorId,
    authorName: entry.authorName,
    authorAvatar: entry.authorAvatar,
    text: entry.text,
    declared: entry.declared,
    votes: {},
  }));
}

// ----------------------------------------------------------------------------
// Scoring
// ----------------------------------------------------------------------------

export type FolScoreLine = {
  playerId: string;
  reason: string;
  points: number;
  /** "points" scores the line normally; "warning"/"penalty" come from misses. */
  kind: "points" | "warning" | "penalty";
};

/** What the room-size-scaled naughty policy says about one skipped vote. */
export type NaughtyCall = {
  /** This miss's number for the player, 1-based (including the current one). */
  missNumber: number;
  threshold: number;
  /** True when the presenter earns POINTS_NAUGHTY_PENALTY from this miss. */
  penalized: boolean;
};

/** Classify a player's (upcoming) miss given how many they already had. */
export function classifyMiss(
  playerCount: number,
  priorMisses: number,
): NaughtyCall {
  const threshold = warningThreshold(playerCount);
  const missNumber = priorMisses + 1;
  return { missNumber, threshold, penalized: missNumber > threshold };
}

/**
 * Compute the points awarded for a single round given its votes.
 * A vote is correct when it matches the author's private declaration:
 * voters who called it right earn POINTS_CORRECT_VOTE each, and the author
 * earns POINTS_PER_FOOLED for every wrong vote. Unlike game 1 there is no
 * diminishing author multiplier — authors are known, so the snowball
 * concern that motivated it doesn't apply.
 *
 * Non-voters are judged by the naughty list: while their warnings last a
 * zero-point "warning" line is emitted, and once they're used up every
 * further miss pays the author POINTS_NAUGHTY_PENALTY as a "penalty" line.
 * `opts` carries each player's miss count BEFORE this round; omitting it
 * (e.g. tests) skips naughty lines entirely.
 */
export function scoreVoteRound(
  round: FolRound,
  opts?: { playerCount: number; missedVotes: Record<string, number> },
): FolScoreLine[] {
  const lines: FolScoreLine[] = [];
  let fooled = 0;

  for (const [voterId, vote] of Object.entries(round.votes)) {
    if (voterId === round.authorId) continue; // authors don't vote on their own
    if (vote === round.declared) {
      lines.push({
        playerId: voterId,
        reason: `Called it a ${vote === "fact" ? "Treat" : "Trick"} — correct`,
        points: POINTS_CORRECT_VOTE,
        kind: "points",
      });
    } else {
      fooled += 1;
    }
  }

  if (fooled > 0) {
    lines.push({
      playerId: round.authorId,
      reason: `Fooled ${fooled} ${fooled === 1 ? "trick-or-treater" : "trick-or-treaters"}`,
      points: fooled * POINTS_PER_FOOLED,
      kind: "points",
    });
  }

  if (opts) {
    for (const p of Object.keys(opts.missedVotes)) {
      if (p === round.authorId) continue; // the presenter never votes
      if (round.votes[p] !== undefined) continue; // they answered in time
      const call = classifyMiss(opts.playerCount, opts.missedVotes[p] ?? 0);
      if (call.penalized) {
        lines.push({
          playerId: round.authorId,
          reason: `${NAUGHTY_COPY} — a no-show hands the presenter a free bonus`,
          points: POINTS_NAUGHTY_PENALTY,
          kind: "penalty",
        });
      } else {
        lines.push({
          playerId: p,
          reason: `Skipped the vote — ${NAUGHTY_COPY} (warning ${call.missNumber} of ${call.threshold})`,
          points: 0,
          kind: "warning",
        });
      }
    }
  }

  return lines;
}

/** Players who still need to vote in the given round (everyone except author). */
export function pendingVoters(round: FolRound, players: FolPlayer[]): FolPlayer[] {
  return players.filter(
    (p) => p.id !== round.authorId && round.votes[p.id] === undefined,
  );
}
