"use client";

import Image from "next/image";

// The collection has three distinct marks: the Two Truths logo (game 1 + its
// splash), the Tricked or Treat gingerbread logo (game 2), and the arcade
// mascot (the landing page). Callers pass the one they want; default is
// game 1 so existing <Logo /> usages keep working.
export const LOGOS = {
  twoTruths: { src: "/2-truths-1-who-logo.png", alt: "Two Truths, One Who logo" },
  trickedOrTreat: {
    src: "/Tricked or Treat Gingerbread Logo.png",
    alt: "Tricked or Treat logo",
  },
  arcade: {
    src: "/Cool_Icebreaker_Mascot_Badge-removebg-preview.png",
    alt: "Icebreaker Arcade mascot",
  },
} as const;

export function Logo({
  size = 160,
  className = "",
  logo = LOGOS.twoTruths,
}: {
  size?: number;
  className?: string;
  logo?: { src: string; alt: string };
}) {
  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={logo.src}
        alt={logo.alt}
        width={size}
        height={size}
        priority
        // Logos aren't all square — keep both dimensions intrinsic so
        // next/image doesn't warn, then clamp inside the square box.
        style={{ width: "auto", height: "auto", maxWidth: "100%", maxHeight: "100%" }}
        className="object-contain"
      />
    </div>
  );
}
