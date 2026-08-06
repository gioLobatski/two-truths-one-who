"use client";

import { useState } from "react";
import {
  AUTHOR_MULTIPLIER_FIRST,
  AUTHOR_MULTIPLIER_SECOND,
  MIN_PLAYERS,
  POINTS_CORRECT_GUESS,
  POINTS_PER_FOOLED,
  TRUTHS_PER_PLAYER,
} from "@/lib/game";
import { Button } from "./ui";

/**
 * Shared manual body — game flow, controls, and scoring.
 * Used by the floating "?" popup and by the second window of the game-start
 * intro, so both always show the same mechanics.
 */
export function ManualContent() {
  return (
    <div className="space-y-4 text-left text-sm leading-relaxed text-slate-300">
      <section className="space-y-1.5">
        <h3 className="text-xs font-bold uppercase tracking-wide text-cyan-300">
          Game flow
        </h3>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Each player secretly writes{" "}
            <strong className="text-white">
              {TRUTHS_PER_PLAYER} true things
            </strong>{" "}
            about themselves.
          </li>
          <li>
            Every round, one truth is revealed{" "}
            <strong className="text-white">anonymously</strong> and everyone
            guesses who wrote it.
          </li>
          <li>
            The author is revealed, points are awarded, and the next truth is
            drawn at random.
          </li>
        </ul>
      </section>

      <section className="space-y-1.5">
        <h3 className="text-xs font-bold uppercase tracking-wide text-cyan-300">
          Controls
        </h3>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong className="text-white">Players:</strong> lock in your
            truths, then tap a name to guess each round.
          </li>
          <li>
            <strong className="text-white">Host:</strong> moves the room
            through each phase — start, guessing, reveal &amp; score, next
            round. The host can play too, or just moderate.
          </li>
          <li>
            Rooms need at least{" "}
            <strong className="text-white">{MIN_PLAYERS} players</strong> to
            start.
          </li>
        </ul>
      </section>

      <section className="space-y-1.5">
        <h3 className="text-xs font-bold uppercase tracking-wide text-cyan-300">
          Scoring
        </h3>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong className="text-amber-300">+{POINTS_CORRECT_GUESS}</strong>{" "}
            for naming the correct author.
          </li>
          <li>
            <strong className="text-amber-300">+{POINTS_PER_FOOLED}</strong> to
            the author for each player fooled by a wrong guess.
          </li>
          <li>
            The fooling reward pays ×{AUTHOR_MULTIPLIER_FIRST} on the
            author&apos;s first reveal and ×{AUTHOR_MULTIPLIER_SECOND} after
            that.
          </li>
          <li>
            The deck is cut before every truth appears — nobody can win by
            elimination.
          </li>
        </ul>
      </section>
    </div>
  );
}

/**
 * Floating "?" manual button pinned to the bottom-right corner.
 * Hovering shows a "Click me to know more" hint; clicking opens the manual
 * as a centered lightbox modal.
 */
export function HelpButton() {
  const [hovered, setHovered] = useState(false);
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating button + hover hint */}
      <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2">
        {hovered && !open && (
          <div className="rounded-full bg-zinc-950/95 px-3 py-1.5 text-xs font-medium text-slate-200 shadow-lg shadow-black/40 ring-1 ring-inset ring-white/15 backdrop-blur">
            Click me to know more
          </div>
        )}
        <button
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onClick={() => setOpen(true)}
          aria-label="How to play"
          className="h-12 w-12 cursor-pointer rounded-full bg-amber-400 text-xl font-black text-black shadow-lg shadow-amber-900/40 transition hover:bg-amber-300 active:scale-95"
        >
          ?
        </button>
      </div>

      {/* Manual lightbox */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[85dvh] w-full max-w-xl overflow-y-auto rounded-2xl bg-zinc-950 p-6 shadow-2xl shadow-black/60 ring-1 ring-inset ring-white/15 sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="font-heading text-xs font-black uppercase tracking-wide text-amber-400">
                How to play
              </p>
              <button
                onClick={() => setOpen(false)}
                className="cursor-pointer text-sm text-slate-400 transition hover:text-white"
                aria-label="Close manual"
              >
                ✕
              </button>
            </div>
            <ManualContent />
            <Button className="mt-6 w-full" onClick={() => setOpen(false)}>
              Got it!
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Two-window intro shown when the submission phase starts.
 * Window 1 explains the nature of the game; window 2 shows the mechanics
 * (same content as the floating manual popup).
 */
export function GameStartIntro({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<1 | 2>(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
      <div className="max-h-[85dvh] w-full max-w-xl overflow-y-auto rounded-2xl bg-zinc-950 p-6 shadow-2xl shadow-black/60 ring-1 ring-inset ring-white/15 sm:p-8">
        {step === 1 ? (
          <>
            <p className="text-xs font-bold uppercase tracking-wide text-cyan-300">
              The game
            </p>
            <h2 className="font-heading mt-1 text-2xl font-black text-white">
              What is <span className="text-cyan-400">Two Truths,</span>{" "}
              <span className="text-amber-400">One Who?</span>
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-300">
              A party game of deduction and deception. Every player writes{" "}
              <strong className="text-white">
                {TRUTHS_PER_PLAYER} true things
              </strong>{" "}
              about themselves — true, but vague enough that they can&apos;t be
              traced back easily.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              Every round, one truth is revealed{" "}
              <strong className="text-white">anonymously</strong> and the whole
              room guesses <strong className="text-white">who wrote it</strong>.
              Read people to score — and stay hidden when your own truth comes
              up.
            </p>
            <Button className="mt-6 w-full" onClick={() => setStep(2)}>
              Next — the mechanics
            </Button>
          </>
        ) : (
          <>
            <p className="text-xs font-bold uppercase tracking-wide text-cyan-300">
              Mechanics
            </p>
            <h2 className="font-heading mt-1 text-2xl font-black text-white">
              How it works
            </h2>
            <div className="mt-4">
              <ManualContent />
            </div>
            <Button className="mt-6 w-full" onClick={onClose}>
              Got it — let&apos;s play!
            </Button>
          </>
        )}

        {/* Step indicator */}
        <div className="mt-5 flex justify-center gap-2">
          <span
            className={`h-1.5 w-6 rounded-full transition ${
              step === 1 ? "bg-amber-400" : "bg-white/15"
            }`}
          />
          <span
            className={`h-1.5 w-6 rounded-full transition ${
              step === 2 ? "bg-amber-400" : "bg-white/15"
            }`}
          />
        </div>
      </div>
    </div>
  );
}
