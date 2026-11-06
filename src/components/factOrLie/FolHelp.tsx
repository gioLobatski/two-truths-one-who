"use client";

import {
  MIN_PLAYERS,
  NAUGHTY_COPY,
  POINTS_CORRECT_VOTE,
  POINTS_NAUGHTY_PENALTY,
  POINTS_PER_FOOLED,
  STATEMENTS_PER_PLAYER,
  VOTE_TIME_LIMIT,
} from "@/lib/factOrLie";

/**
 * Tricked or Treat ruleset for the floating "?" manual. Same section shape
 * as game 1's ManualContent, wired in via <HelpButton content={...} />.
 */
export function FolManualContent() {
  return (
    <div className="space-y-4 text-left text-sm leading-relaxed text-slate-300">
      <section className="space-y-1.5">
        <h3 className="text-xs font-bold uppercase tracking-wide text-orange-300">
          Game flow
        </h3>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Each player secretly writes{" "}
            <strong className="text-white">
              {STATEMENTS_PER_PLAYER} statements
            </strong>{" "}
            about themselves — straight treats of truth or tricks of lies —
            and privately marks each one treat (true) or trick (lie).
          </li>
          <li>
            Every round, one statement is revealed{" "}
            <strong className="text-white">with its author named</strong> —
            you always know who is trying to trick you.
          </li>
          <li>
            Everyone except the author votes{" "}
            <strong className="text-white">Trick or Treat</strong> before the{" "}
            <strong className="text-white">{VOTE_TIME_LIMIT}-second</strong>{" "}
            timer runs out — that&apos;s deliberately fast, so there&apos;s no
            time to ask the internet.
          </li>
          <li>
            The author&apos;s private mark is revealed, the room&apos;s calls
            are tallied, and points are awarded.
          </li>
        </ul>
      </section>

      <section className="space-y-1.5">
        <h3 className="text-xs font-bold uppercase tracking-wide text-orange-300">
          Controls
        </h3>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong className="text-white">Players:</strong> lock in your
            statements, then tap Trick or Treat each round — you can re-call
            until the clock dies.
          </li>
          <li>
            <strong className="text-white">Host:</strong> moves the room
            through each phase — open voting, reveal &amp; score, next round.
            A host who only moderates can peek at the truth each round, but
            it stays hidden until they click{" "}
            <strong className="text-white">&quot;Peek at the truth&quot;</strong>{" "}
            — safe for screen-sharing the room.
          </li>
          <li>
            Rooms need at least{" "}
            <strong className="text-white">{MIN_PLAYERS} players</strong> to
            start.
          </li>
        </ul>
      </section>

      <section className="space-y-1.5">
        <h3 className="text-xs font-bold uppercase tracking-wide text-orange-300">
          Scoring
        </h3>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong className="text-amber-300">+{POINTS_CORRECT_VOTE}</strong>{" "}
            for every voter who called the statement correctly.
          </li>
          <li>
            <strong className="text-amber-300">+{POINTS_PER_FOOLED}</strong> to
            the author for each player they fooled with a wrong call.
          </li>
          <li>
            Your private treat/trick mark decides the truth at reveal — mark
            honestly, the system scores against it.
          </li>
          <li>
            The deck is cut before every statement appears — nobody can win by
            counting what&apos;s left.
          </li>
          <li>
            Statements are <strong className="text-white">copy-protected</strong>{" "}
            — no selecting, dragging, or right-clicking the wording. Use your
            eyes and your wits.
          </li>
        </ul>
      </section>

      <section className="space-y-1.5">
        <h3 className="text-xs font-bold uppercase tracking-wide text-orange-300">
          The naughty list 🎅
        </h3>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Let the timer hit zero without voting and{" "}
            <strong className="text-white">{NAUGHTY_COPY}</strong> Small
            rooms (under 5) get <strong className="text-white">1 warning</strong>,
            mid-size rooms (5–9) get <strong className="text-white">2</strong>,
            and rooms of 10+ get <strong className="text-white">3</strong>.
          </li>
          <li>
            Once your warnings run out, every further no-show hands the
            presenter <strong className="text-rose-300">+{POINTS_NAUGHTY_PENALTY}</strong>{" "}
            for the rest of the game — respect your fellow trick-or-treaters.
          </li>
        </ul>
      </section>
    </div>
  );
}
