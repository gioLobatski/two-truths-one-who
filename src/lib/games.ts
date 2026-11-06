// Central registry for the game collection. The landing page cards, page
// metadata, and per-game chrome all read from here, so renaming a game or
// changing its route slug is a one-place edit.

export type GameMeta = {
  /** Stable id used for keys (localStorage prefixes, help lookups). */
  id: string;
  /** URL slug — appears in routes like /<slug>. */
  slug: string;
  /** Display name shown on cards, titles, and manuals. */
  displayName: string;
  /** One-line pitch shown under the card title. */
  tagline: string;
  /** Player-count note shown on the card. */
  playersNote: string;
};

export const GAMES: GameMeta[] = [
  {
    id: "two-truths",
    slug: "two-truths",
    displayName: "Two Truths, One Who",
    tagline: "Write truths about you. Guess who wrote what. Fool everyone.",
    playersNote: "3+ players",
  },
  {
    id: "tricked-or-treat",
    slug: "tricked-or-treat",
    displayName: "Tricked or Treat",
    tagline:
      "Say something about you — a treat of a truth, or a trick of a lie. The room calls it before the clock runs out.",
    playersNote: "3+ players",
  },
];

export function gameMeta(id: string): GameMeta {
  const meta = GAMES.find((g) => g.id === id);
  if (!meta) throw new Error(`Unknown game id: ${id}`);
  return meta;
}
