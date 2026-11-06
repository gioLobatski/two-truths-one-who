"use client";

import type { SyntheticEvent } from "react";
import Image from "next/image";

// Hollow-head gingerbread sticker. The head is deliberately cut out so the
// player's avatar emoji can be dropped in behind it — the emoji shows
// "through" the hollow head like a face.
const GINGERBREAD_SRC = "/Hollow-Head Gingerbread Cookie Sticker.png";

// Where the avatar sits inside the head, as a fraction of the figure box.
// The sticker is portrait (~4:5) and object-contain centers it, so the
// horizontally-centered head maps cleanly: its middle is ~25% down and the
// hollow circle is ~31% of the height. Tuned against the actual artwork.
const HEAD = { leftPct: 50, topPct: 25, sizePct: 30 } as const;

/**
 * The statement "on trial": the author's gingerbread avatar on the left with
 * their emoji in the hollow head, and their words in a speech bubble to the
 * right. Used by both the voting screen and the round-result reveal.
 *
 * Anti-cheat guardrail: the whole block is non-selectable and copy/cut/
 * context-menu/drag are blocked, so players can't lift the wording and
 * search it in an LLM. This is a deterrent, not a lock — screenshots and
 * retyping are always possible; the 7-second clock does the heavy lifting.
 */
export function GingerbreadStatement({
  text,
  authorName,
  avatar,
  size = 128,
}: {
  text: string;
  authorName: string;
  avatar: string;
  size?: number;
}) {
  const blockDefault = (e: SyntheticEvent) => e.preventDefault();

  return (
    <div
      className="flex w-full select-none items-center gap-3 sm:gap-5"
      onCopy={blockDefault}
      onCut={blockDefault}
      onContextMenu={blockDefault}
      onDragStart={blockDefault}
    >
      {/* Gingerbread figure with the player's emoji as its hollow head */}
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <span
          className="absolute flex items-center justify-center leading-none"
          style={{
            left: `${HEAD.leftPct}%`,
            top: `${HEAD.topPct}%`,
            width: `${HEAD.sizePct}%`,
            height: `${HEAD.sizePct}%`,
            transform: "translate(-50%, -50%)",
            fontSize: `${(HEAD.sizePct / 100) * size * 0.9}px`,
          }}
          aria-hidden
        >
          {avatar}
        </span>
        <Image
          src={GINGERBREAD_SRC}
          alt={`${authorName}'s gingerbread`}
          width={size}
          height={size}
          draggable={false}
          // Fill the square box on both axes (object-contain preserves the
          // art's ratio) so head percentages below map to the same box.
          style={{ width: "100%", height: "100%" }}
          className="relative z-10 object-contain"
          priority
        />
      </div>

      {/* Speech bubble pointing back at the gingerbread */}
      <div className="relative flex-1">
        <span
          className="absolute -left-2 top-1/2 h-4 w-4 -translate-y-1/2 rotate-45 bg-white"
          aria-hidden
        />
        <div className="rounded-2xl bg-white px-5 py-4 shadow-lg">
          <p className="text-xs font-bold uppercase tracking-wide text-orange-500">
            {authorName}
          </p>
          <p className="mt-1 text-lg font-medium leading-relaxed text-zinc-900">
            &ldquo;{text}&rdquo;
          </p>
        </div>
      </div>
    </div>
  );
}
