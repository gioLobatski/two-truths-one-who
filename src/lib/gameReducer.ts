// Reducer holding all game state transitions. Kept separate from React UI so
// the same action shapes can later be sent over the network to Supabase.

import {
  GameState,
  Player,
  Round,
  TRUTHS_PER_PLAYER,
  buildRounds,
  createEmptyGame,
  makeId,
  scoreRound,
} from "./game";

export type Action =
  | { type: "ADD_PLAYER"; name: string }
  | { type: "REMOVE_PLAYER"; playerId: string }
  | { type: "START_SUBMISSION" }
  | { type: "SET_TRUTHS"; playerId: string; truths: string[] }
  | { type: "START_GAME" }
  | { type: "REVEAL_ROUND" }
  | { type: "SUBMIT_GUESS"; guesserId: string; guessedId: string }
  | { type: "SCORE_ROUND" }
  | { type: "NEXT_ROUND" }
  | { type: "RESET" };

function updatePlayer(
  players: Player[],
  playerId: string,
  patch: Partial<Player>,
): Player[] {
  return players.map((p) => (p.id === playerId ? { ...p, ...patch } : p));
}

export function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "ADD_PLAYER": {
      const name = action.name.trim();
      if (name.length === 0) return state;
      const player: Player = {
        id: makeId("player"),
        name,
        truths: Array(TRUTHS_PER_PLAYER).fill(""),
        score: 0,
      };
      return { ...state, players: [...state.players, player] };
    }

    case "REMOVE_PLAYER": {
      return {
        ...state,
        players: state.players.filter((p) => p.id !== action.playerId),
      };
    }

    case "START_SUBMISSION": {
      return { ...state, phase: "submission" };
    }

    case "SET_TRUTHS": {
      const truths = action.truths.slice(0, TRUTHS_PER_PLAYER);
      return {
        ...state,
        players: updatePlayer(state.players, action.playerId, { truths }),
      };
    }

    case "START_GAME": {
      const rounds = buildRounds(state.players);
      return {
        ...state,
        rounds,
        currentRoundIndex: 0,
        phase: rounds.length > 0 ? "reveal" : "lobby",
      };
    }

    case "REVEAL_ROUND": {
      return { ...state, phase: "guessing" };
    }

    case "SUBMIT_GUESS": {
      const round = state.rounds[state.currentRoundIndex];
      if (!round) return state;
      const updatedRound: Round = {
        ...round,
        guesses: { ...round.guesses, [action.guesserId]: action.guessedId },
      };
      const rounds = state.rounds.map((r, i) =>
        i === state.currentRoundIndex ? updatedRound : r,
      );
      return { ...state, rounds };
    }

    case "SCORE_ROUND": {
      const round = state.rounds[state.currentRoundIndex];
      if (!round) return state;
      const lines = scoreRound(round);
      let players = state.players;
      for (const line of lines) {
        const current = players.find((p) => p.id === line.playerId);
        if (!current) continue;
        players = updatePlayer(players, line.playerId, {
          score: current.score + line.points,
        });
      }
      return { ...state, players, phase: "roundResult" };
    }

    case "NEXT_ROUND": {
      const next = state.currentRoundIndex + 1;
      if (next >= state.rounds.length) {
        return { ...state, phase: "gameOver" };
      }
      return { ...state, currentRoundIndex: next, phase: "reveal" };
    }

    case "RESET": {
      return createEmptyGame();
    }

    default:
      return state;
  }
}
