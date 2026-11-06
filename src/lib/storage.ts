// Per-game localStorage session keys. Each game gets its own prefix so two
// game sessions can coexist in one browser (and tabs opened for different
// games never clobber each other's ids).
//
// Game 1 keeps its original unprefixed key names so sessions that existed
// before the collection shell landed are not broken.

const GAME1_KEYS = {
  playerId: "two-truths-player-id",
  gameId: "two-truths-game-id",
  host: "two-truths-is-host",
} as const;

const PREFIXES: Record<string, string> = {
  "tricked-or-treat": "tot",
};

export type SessionKeys = {
  playerId: string;
  gameId: string;
  host: string;
};

export function sessionKeys(gameId: string): SessionKeys {
  if (gameId === "two-truths") return GAME1_KEYS;
  const prefix = PREFIXES[gameId] ?? gameId;
  return {
    playerId: `${prefix}-player-id`,
    gameId: `${prefix}-game-id`,
    host: `${prefix}-is-host`,
  };
}

export function getStored(key: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(key);
}

export function setStored(key: string, value: string) {
  localStorage.setItem(key, value);
}

export function clearStored(keys: SessionKeys) {
  localStorage.removeItem(keys.playerId);
  localStorage.removeItem(keys.gameId);
  localStorage.removeItem(keys.host);
}
