"use client";

import Link from "next/link";
import { GAMES } from "@/lib/games";
import { Logo, LOGOS } from "./Logo";
import { Screen, Subtitle, Title } from "./ui";

// Each game card wears its own logo — the arcade mascot stays on the header
// only, and the Two Truths mark lives solely on its game.
const CARD_LOGOS: Record<string, { src: string; alt: string }> = {
  "two-truths": LOGOS.twoTruths,
  "tricked-or-treat": LOGOS.trickedOrTreat,
};

/**
 * Landing screen for the game collection: one card per game, each linking to
 * that game's route. Deliberately a pure chooser — create/join stays inside
 * each game's own home screen so the shell never couples to game specifics.
 */
export function GamePicker() {
  return (
    <Screen>
      <Logo size={140} logo={LOGOS.arcade} />
      <div className="space-y-2">
        <Title>
          <span className="text-cyan-400">Icebreaker</span>{" "}
          <span className="text-amber-400">Arcade</span>
        </Title>
        <Subtitle>Pick a game, share the code, fool your friends.</Subtitle>
      </div>

      <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-2">
        {GAMES.map((game) => (
          <Link
            key={game.id}
            href={`/${game.slug}`}
            className="group flex flex-col justify-between rounded-2xl bg-white/[0.06] p-6 text-left shadow-2xl shadow-black/40 ring-1 ring-inset ring-white/10 backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/[0.1] hover:ring-amber-400/40 active:scale-[0.99]"
          >
            <div className="space-y-3">
              {CARD_LOGOS[game.id] && (
                <Logo size={84} logo={CARD_LOGOS[game.id]} className="mx-auto" />
              )}
              <p className="font-heading text-xl font-black text-balance text-white sm:text-2xl">
                {game.displayName}
              </p>
              <p className="text-sm leading-relaxed text-slate-300/70">
                {game.tagline}
              </p>
            </div>
            <div className="mt-6 flex items-center justify-between">
              <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-200/80 ring-1 ring-inset ring-cyan-400/20">
                {game.playersNote}
              </span>
              <span className="text-sm font-semibold text-amber-400 transition group-hover:translate-x-1">
                Play →
              </span>
            </div>
          </Link>
        ))}
      </div>
    </Screen>
  );
}
