"use client";

import {
  MIN_PLAYERS,
  POINTS_CORRECT_VOTE,
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
        <h3 className="text-xs font-bold uppercase tracking-wide text-cyan-300">
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
            timer runs out.
          </li>
          <li>
            The author&apos;s private mark is revealed, the room&apos;s calls
            are tallied, and points are awarded.
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
            statements, then tap Trick or Treat each round — you can re-call
            until the clock dies.
          </li>
          <li>
            <strong className="text-white">Host:</strong> moves the room
            through each phase — open voting, reveal &amp; score, next round.
            A host who only moderates gets a private peek at the truth each
            round.
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
            Let the timer hit zero and you sit the round out — no vote, no
            points.
          </li>
        </ul>
      </section>
    </div>
  );
}
